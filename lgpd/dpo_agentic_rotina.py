#!/usr/bin/env python3
# =============================================================================
# DPO Agentic — Rotina de Conformidade LGPD | ColaborarCRM
# Versão   : 4.0.0
# =============================================================================
# Autenticação QAP: Portado do qapService.js do Conect Trelo.
# Fluxo: LOGIN → JWT Token → Busca Contato → Resolve Conversa → Envia Mensagem
# Base URL: https://conectsolutionsti.dev.br/Messenger
# =============================================================================

from __future__ import annotations

import hashlib
import json
import logging
import logging.handlers
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

# ---------------------------------------------------------------------------
# Dependências externas
# ---------------------------------------------------------------------------
try:
    import fdb
except ImportError:
    sys.exit("[ERRO FATAL] Execute: pip install fdb")

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:
    sys.exit("[ERRO FATAL] Execute: pip install requests")

try:
    from dotenv import load_dotenv
except ImportError:
    sys.exit("[ERRO FATAL] Execute: pip install python-dotenv")


# =============================================================================
# 1. PATHS E CARREGAMENTO DO .ENV
# =============================================================================
BASE_DIR = Path(__file__).resolve().parent

for _env_path in [BASE_DIR / ".env", BASE_DIR / ".." / "src" / "server" / ".env"]:
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path)
        break


# =============================================================================
# 2. LOGGING ROTATIVO
# =============================================================================
def _configurar_logging() -> logging.Logger:
    log_file = BASE_DIR / "dpo_agentic.log"
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)-8s] %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S"
    )
    rotating = logging.handlers.RotatingFileHandler(
        log_file, maxBytes=5 * 1024 * 1024, backupCount=7, encoding="utf-8"
    )
    rotating.setFormatter(formatter)
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)

    log = logging.getLogger("DPO_Agentic")
    log.setLevel(logging.DEBUG)
    log.addHandler(rotating)
    log.addHandler(console)
    return log


logger = _configurar_logging()


# =============================================================================
# 3. CONFIGURAÇÕES VIA .ENV
# =============================================================================
def _obrigatorio(nome: str) -> str:
    valor = os.getenv(nome)
    if not valor:
        logger.critical(f"Variável obrigatória não definida: '{nome}'. Abortando.")
        sys.exit(1)
    return valor


# Firebird
FB_HOST     : str = os.getenv("DB_HOST", "127.0.0.1")
FB_PORT     : int = int(os.getenv("DB_PORT", "3050"))
FB_DATABASE : str = _obrigatorio("DB_DATABASE")
FB_USER     : str = os.getenv("DB_USER", "SYSDBA")
FB_PASSWORD : str = _obrigatorio("DB_PASSWORD")

# QAP Messenger — autenticação via login/senha (igual ao qapService.js)
QAP_BASE_URL : str = os.getenv("QAP_BASE_URL", "https://conectsolutionsti.dev.br/Messenger")
QAP_USERNAME : str = _obrigatorio("QAP_USERNAME")
QAP_PASSWORD : str = _obrigatorio("QAP_PASSWORD")

# Telefone(s) dos administradores que receberão o alerta (separados por vírgula)
# Ex: QAP_ADMIN_PHONES=5511945457934,5511945457973
QAP_ADMIN_PHONES_RAW : str = _obrigatorio("QAP_ADMIN_PHONES")
QAP_ADMIN_PHONES     : List[str] = [p.strip() for p in QAP_ADMIN_PHONES_RAW.split(",") if p.strip()]

# VibeFlow (opcional)
VIBEFLOW_WEBHOOK_URL : Optional[str] = os.getenv("VIBEFLOW_WEBHOOK_URL")

# Parâmetros de negócio
ANOS_INATIVIDADE : int = int(os.getenv("LGPD_ANOS_INATIVIDADE", "5"))
HTTP_TIMEOUT_S   : int = int(os.getenv("HTTP_TIMEOUT_S", "15"))


# =============================================================================
# 4. MODELOS DE DADOS
# =============================================================================
@dataclass
class ResultadoConsulta:
    total: int = 0
    ids: List[int] = field(default_factory=list)
    data_mais_antiga: Optional[datetime] = None
    data_corte: Optional[datetime] = None


@dataclass
class ResultadoExecucao:
    execution_id: str = ""
    timestamp_inicio: str = ""
    status: str = "ERRO"
    total_encontrados: int = 0
    ids_encontrados: List[int] = field(default_factory=list)
    alertas_enviados: List[str] = field(default_factory=list)
    erro: Optional[str] = None

    def para_dict(self) -> dict:
        return {
            "execution_id":      self.execution_id,
            "timestamp_inicio":  self.timestamp_inicio,
            "status":            self.status,
            "total_encontrados": self.total_encontrados,
            "ids_encontrados":   self.ids_encontrados,
            "alertas_enviados":  self.alertas_enviados,
            "erro":              self.erro,
        }


# =============================================================================
# 5. CLIENTE QAP MESSENGER
# Portado diretamente do qapService.js do Conect Trelo.
# Fluxo: Login → JWT → Contatos → Conversa Privada → Envio
# =============================================================================
class QAPClient:
    """
    Encapsula toda a comunicação com o QAP Messenger.
    Mantém o token JWT em memória com renovação automática antes do vencimento
    (igual ao padrão do qapService.js: token válido 23h/24h).
    """

    # Tempo de vida do token: renovar 1h antes do vencimento declarado (23h)
    TOKEN_TTL_S = 23 * 3600

    def __init__(self) -> None:
        self._token: Optional[str] = None
        self._token_expiry: Optional[float] = None  # epoch seconds
        self._session = self._criar_sessao()

    # ------------------------------------------------------------------
    # HTTP Session com retry automático em erros 5xx
    # ------------------------------------------------------------------
    @staticmethod
    def _criar_sessao() -> requests.Session:
        sessao = requests.Session()
        retry = Retry(
            total=3,
            backoff_factor=1.5,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["GET", "POST"],
        )
        adapter = HTTPAdapter(max_retries=retry)
        sessao.mount("https://", adapter)
        sessao.mount("http://", adapter)
        return sessao

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._token}",
            "Content-Type":  "application/json",
            "User-Agent":    "ColaborarCRM-DPO-Agentic/4.0",
        }

    # ------------------------------------------------------------------
    # Autenticação
    # ------------------------------------------------------------------
    def _precisa_renovar(self) -> bool:
        if not self._token or not self._token_expiry:
            return True
        return (self._token_expiry - 300) <= datetime.now(timezone.utc).timestamp()

    def login(self) -> bool:
        """POST /api/auth/login — idêntico ao qapService.js."""
        url = f"{QAP_BASE_URL}/api/auth/login"
        logger.info(f"[QAP] Autenticando em {url}...")
        try:
            resp = self._session.post(
                url,
                json={"username": QAP_USERNAME, "password": QAP_PASSWORD},
                timeout=HTTP_TIMEOUT_S,
            )
            resp.raise_for_status()
            data = resp.json()
            self._token        = data.get("token")
            self._token_expiry = datetime.now(timezone.utc).timestamp() + self.TOKEN_TTL_S

            if not self._token:
                logger.error("[QAP] Login OK mas 'token' ausente na resposta.")
                return False

            logger.info("[QAP] Login realizado com sucesso.")
            return True

        except requests.exceptions.HTTPError as e:
            logger.error(f"[QAP] Erro HTTP no login: {e.response.status_code} — {e.response.text[:200]}")
        except requests.exceptions.RequestException as e:
            logger.error(f"[QAP] Falha de conexão no login: {e}")
        return False

    def _garantir_autenticado(self) -> None:
        """Renova o token se necessário. Lança exceção se falhar."""
        if self._precisa_renovar():
            if not self.login():
                raise RuntimeError("Falha na autenticação com QAP Messenger.")

    # ------------------------------------------------------------------
    # Busca de contatos
    # ------------------------------------------------------------------
    def _get_contacts(self) -> list:
        """GET /api/users/contacts"""
        self._garantir_autenticado()
        try:
            resp = self._session.get(
                f"{QAP_BASE_URL}/api/users/contacts",
                headers=self._headers(),
                timeout=HTTP_TIMEOUT_S,
            )
            resp.raise_for_status()
            raw = resp.json()
            contacts = [
                {
                    "id":    c.get("contact_id") or c.get("id"),
                    "name":  c.get("username") or c.get("name", "Desconhecido"),
                    "phone": c.get("phone", ""),
                }
                for c in raw
            ]
            logger.info(f"[QAP] {len(contacts)} contatos carregados.")
            return contacts
        except Exception as e:
            logger.warning(f"[QAP] Falha ao buscar contatos: {e}")
            return []

    # ------------------------------------------------------------------
    # Resolução de conversa por telefone
    # ------------------------------------------------------------------
    @staticmethod
    def _normalizar_phone(phone: str) -> str:
        return re.sub(r"[^0-9]", "", str(phone))

    def _encontrar_user_id_por_phone(self, phone: str) -> Optional[int]:
        """
        Tenta múltiplas estratégias para localizar o user_id pelo telefone.
        Replicado do qapService.js — findUserByPhone().
        """
        target = self._normalizar_phone(phone)

        # Estratégia 1: Lista de contatos
        contacts = self._get_contacts()
        for c in contacts:
            c_phone = self._normalizar_phone(c.get("phone", ""))
            if c_phone and (c_phone == target or target.endswith(c_phone) or c_phone.endswith(target)):
                logger.info(f"[QAP] Contato encontrado na lista: {c['name']} (ID: {c['id']})")
                return c["id"]

        # Estratégia 2: Endpoints de busca por telefone
        estrategias = [
            {"method": "get", "url": f"{QAP_BASE_URL}/api/users/search", "params": {"q": target}},
            {"method": "get", "url": f"{QAP_BASE_URL}/api/users/phone/{target}"},
            {"method": "get", "url": f"{QAP_BASE_URL}/api/users/phone", "params": {"number": target}},
        ]

        for est in estrategias:
            try:
                resp = self._session.request(
                    method=est["method"],
                    url=est["url"],
                    headers=self._headers(),
                    params=est.get("params"),
                    timeout=HTTP_TIMEOUT_S,
                )
                data = resp.json()
                user = None
                if isinstance(data, list):
                    user = next(
                        (u for u in data if self._normalizar_phone(u.get("phone", "")) == target),
                        None,
                    )
                elif isinstance(data, dict) and data.get("id"):
                    user = data

                if user and user.get("id"):
                    logger.info(f"[QAP] Usuário encontrado via busca: ID {user['id']}")
                    return user["id"]
            except Exception:
                continue

        logger.warning(f"[QAP] Usuário não encontrado para o telefone {phone}.")
        return None

    def _resolver_conversa(self, phone: str) -> Optional[int]:
        """
        Localiza ou cria uma conversa privada com o usuário.
        Replicado do qapService.js — getConversationId().
        POST /api/conversations/private com otherUserId.
        """
        self._garantir_autenticado()
        user_id = self._encontrar_user_id_por_phone(phone)

        if not user_id:
            return None

        try:
            logger.info(f"[QAP] Abrindo conversa privada com User ID {user_id}...")
            resp = self._session.post(
                f"{QAP_BASE_URL}/api/conversations/private",
                json={"otherUserId": user_id},
                headers=self._headers(),
                timeout=HTTP_TIMEOUT_S,
            )
            data = resp.json()
            if data.get("id"):
                return data["id"]
        except requests.exceptions.HTTPError as e:
            # Conversa já existe — o QAP retorna 400 mas com o ID
            if e.response.status_code == 400:
                try:
                    data = e.response.json()
                    if data.get("id"):
                        return data["id"]
                except Exception:
                    pass
            logger.error(f"[QAP] Erro ao abrir conversa: {e}")
        except Exception as e:
            logger.error(f"[QAP] Erro inesperado ao resolver conversa: {e}")

        return None

    # ------------------------------------------------------------------
    # Envio de mensagem — API pública da classe
    # ------------------------------------------------------------------
    def send_message(self, phone: str, message: str) -> bool:
        """
        Envia uma mensagem para um número de telefone.
        POST /api/messages com conversationId e content.
        Replicado do qapService.js — sendMessage().
        """
        logger.info(f"[QAP] Enviando mensagem para {phone}...")

        conversation_id = self._resolver_conversa(phone)
        if not conversation_id:
            logger.error(
                f"[QAP] Falha: não foi possível resolver a conversa para {phone}. "
                "Verifique se o número está cadastrado como contato no QAP."
            )
            return False

        try:
            self._garantir_autenticado()
            resp = self._session.post(
                f"{QAP_BASE_URL}/api/messages",
                json={
                    "conversationId": conversation_id,
                    "content":        message,
                    "replyTo":        0,
                },
                headers=self._headers(),
                timeout=HTTP_TIMEOUT_S,
            )
            resp.raise_for_status()
            logger.info(f"[QAP] ✅ Mensagem enviada para {phone} | ConversaID={conversation_id}")
            return True

        except requests.exceptions.HTTPError as e:
            logger.error(
                f"[QAP] ❌ Erro HTTP ao enviar mensagem: "
                f"{e.response.status_code} — {e.response.text[:300]}"
            )
        except requests.exceptions.RequestException as e:
            logger.error(f"[QAP] ❌ Erro de conexão ao enviar mensagem: {e}")

        return False


# =============================================================================
# 6. CLIENTE VIBEFLOW (opcional)
# =============================================================================
def disparar_vibeflow(payload: dict) -> bool:
    if not VIBEFLOW_WEBHOOK_URL:
        logger.info("[VibeFlow] VIBEFLOW_WEBHOOK_URL não configurado. Pulando.")
        return False
    try:
        resp = requests.post(
            VIBEFLOW_WEBHOOK_URL,
            json=payload,
            headers={
                "Content-Type":   "application/cloudevents+json",
                "ce-specversion": "1.0",
                "ce-type":        payload.get("type", ""),
                "ce-source":      payload.get("source", ""),
                "ce-id":          payload.get("id", ""),
            },
            timeout=HTTP_TIMEOUT_S,
        )
        resp.raise_for_status()
        logger.info(f"[VibeFlow] ✅ Evento injetado. HTTP {resp.status_code}")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"[VibeFlow] ❌ Falha: {e}")
        return False


# =============================================================================
# 7. BANCO DE DADOS — Firebird
# =============================================================================
class ConexaoFirebird:
    def __enter__(self) -> fdb.Connection:
        logger.info(f"Conectando ao Firebird | {FB_HOST}:{FB_PORT} | {FB_DATABASE}")
        self._con = fdb.connect(
            host=FB_HOST, port=FB_PORT, database=FB_DATABASE,
            user=FB_USER, password=FB_PASSWORD, charset="UTF8",
        )
        return self._con

    def __exit__(self, *args) -> bool:
        if hasattr(self, "_con") and self._con:
            self._con.close()
        return False


def consultar_clientes_inativos(con: fdb.Connection) -> ResultadoConsulta:
    """
    Busca clientes cuja LGPD_DATA_ULTIMA_INTERACAO seja anterior ao corte
    E cuja LGPD_BASE_LEGAL seja diferente de 'ANONIMIZADO'.
    """
    resultado = ResultadoConsulta()
    agora      = datetime.now().replace(microsecond=0)
    data_corte = agora - timedelta(days=ANOS_INATIVIDADE * 365)
    resultado.data_corte = data_corte

    logger.info(f"Data de corte: {data_corte.strftime('%Y-%m-%d')} (inatividade > {ANOS_INATIVIDADE} anos)")

    SQL_SUMARIO = """
        SELECT
            COUNT(*)                        AS TOTAL,
            MIN(LGPD_DATA_ULTIMA_INTERACAO) AS DATA_MAIS_ANTIGA
        FROM CLIENTES
        WHERE
            LGPD_DATA_ULTIMA_INTERACAO < ?
            AND (
                LGPD_BASE_LEGAL IS NULL
                OR TRIM(UPPER(LGPD_BASE_LEGAL)) <> 'ANONIMIZADO'
            )
    """

    SQL_IDS = """
        SELECT FIRST 500 ID_CLIENTE
        FROM CLIENTES
        WHERE
            LGPD_DATA_ULTIMA_INTERACAO < ?
            AND (
                LGPD_BASE_LEGAL IS NULL
                OR TRIM(UPPER(LGPD_BASE_LEGAL)) <> 'ANONIMIZADO'
            )
        ORDER BY LGPD_DATA_ULTIMA_INTERACAO ASC
    """

    cur = con.cursor()
    try:
        cur.execute(SQL_SUMARIO, (data_corte,))
        row = cur.fetchone()
        if row:
            resultado.total           = row[0] or 0
            resultado.data_mais_antiga = row[1]

        logger.info(f"Clientes inativos encontrados: {resultado.total}")

        if resultado.total > 0:
            cur.execute(SQL_IDS, (data_corte,))
            resultado.ids = [r[0] for r in cur.fetchall() if r[0] is not None]
            logger.info(f"IDs recuperados: {len(resultado.ids)} (limite 500 por execução)")
    finally:
        cur.close()

    return resultado


# =============================================================================
# 8. MENSAGEM DE ALERTA
# =============================================================================
def montar_mensagem_alerta(resultado: ResultadoConsulta, execution_id: str) -> str:
    """Mensagem legível para envio via QAP Messenger."""
    data_corte_str = resultado.data_corte.strftime("%d/%m/%Y") if resultado.data_corte else "N/A"
    data_antiga_str = (
        resultado.data_mais_antiga.strftime("%d/%m/%Y")
        if resultado.data_mais_antiga else "N/A"
    )
    ids_amostra = ", ".join(str(i) for i in resultado.ids[:10])
    sufixo = f" e mais {resultado.total - 10} outros" if resultado.total > 10 else ""

    return (
        f"⚠️ *DPO Agentic — Alerta LGPD*\n\n"
        f"A rotina detectou *{resultado.total} cliente(s)* sem interação "
        f"há mais de {ANOS_INATIVIDADE} anos.\n\n"
        f"📅 Data de corte: {data_corte_str}\n"
        f"📅 Interação mais antiga: {data_antiga_str}\n"
        f"🔑 IDs (amostra): {ids_amostra}{sufixo}\n\n"
        f"Eles estão prontos para a *anonimização (Soft Delete)* "
        f"conforme LGPD Art. 18.\n\n"
        f"🆔 Execução: {execution_id}"
    )


def montar_payload_vibeflow(resultado: ResultadoConsulta, execution_id: str) -> dict:
    return {
        "specversion": "1.0",
        "type":   "com.colaborarcrm.lgpd.limpeza_pendente",
        "source": "dpo-agentic/rotina-inatividade",
        "id":     execution_id,
        "time":   datetime.now(timezone.utc).isoformat(),
        "data": {
            "total_clientes_inativos": resultado.total,
            "anos_inatividade":        ANOS_INATIVIDADE,
            "data_corte":              resultado.data_corte.strftime("%Y-%m-%d") if resultado.data_corte else None,
            "ids_amostra":             resultado.ids[:50],
            "execution_id":            execution_id,
        },
    }


# =============================================================================
# 9. PERSISTÊNCIA LOCAL
# =============================================================================
def salvar_evidencia(payload: dict, execution_id: str) -> None:
    evidencias_dir = BASE_DIR / "evidencias"
    evidencias_dir.mkdir(exist_ok=True)
    arquivo = evidencias_dir / f"payload_{datetime.now().strftime('%Y%m%d')}_{execution_id}.json"
    with open(arquivo, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2, default=str)
    logger.info(f"Evidência salva em: {arquivo}")


# =============================================================================
# 10. ORQUESTRADOR PRINCIPAL
# =============================================================================
def _gerar_execution_id() -> str:
    ts = datetime.now(timezone.utc).isoformat().encode()
    return hashlib.sha256(ts).hexdigest()[:20].upper()


def executar_rotina_lgpd() -> ResultadoExecucao:
    execution_id = _gerar_execution_id()
    resultado    = ResultadoExecucao(
        execution_id=execution_id,
        timestamp_inicio=datetime.now(timezone.utc).isoformat(),
    )

    sep = "=" * 70
    logger.info(sep)
    logger.info(f"DPO Agentic v4.0.0 | ID: {execution_id}")
    logger.info(f"Critério: LGPD_DATA_ULTIMA_INTERACAO < hoje - {ANOS_INATIVIDADE} anos")
    logger.info(f"          LGPD_BASE_LEGAL <> 'ANONIMIZADO'")
    logger.info(f"Destinos QAP: {QAP_ADMIN_PHONES}")
    logger.info(sep)

    # --- Etapa 1: Consulta Firebird ---
    try:
        with ConexaoFirebird() as con:
            dados = consultar_clientes_inativos(con)
    except fdb.DatabaseError as e:
        resultado.status = "ERRO_BANCO"
        resultado.erro   = f"Firebird: {e}"
        logger.error(f"❌ {resultado.erro}")
        return resultado
    except Exception as e:
        resultado.status = "ERRO_BANCO"
        resultado.erro   = str(e)
        logger.error(f"❌ Erro inesperado no banco: {e}", exc_info=True)
        return resultado

    resultado.total_encontrados = dados.total
    resultado.ids_encontrados   = dados.ids

    # --- Etapa 2: Avaliação ---
    if dados.total == 0:
        logger.info("✅ Nenhum cliente inativo encontrado. Conformidade em dia.")
        resultado.status = "OK_SEM_PENDENCIAS"
        return resultado

    logger.warning(f"⚠️  {dados.total} cliente(s) identificado(s) para anonimização LGPD.")

    # --- Etapa 3: Monta payloads ---
    mensagem_qap    = montar_mensagem_alerta(dados, execution_id)
    payload_vibeflow = montar_payload_vibeflow(dados, execution_id)

    # --- Etapa 4: Salva evidência local ---
    try:
        salvar_evidencia(payload_vibeflow, execution_id)
    except OSError as e:
        logger.warning(f"Não foi possível salvar evidência local: {e}")

    # --- Etapa 5: Dispara alertas QAP ---
    qap = QAPClient()
    for phone in QAP_ADMIN_PHONES:
        if qap.send_message(phone, mensagem_qap):
            resultado.alertas_enviados.append(f"QAP:{phone}")

    # --- Etapa 6: VibeFlow (opcional) ---
    if disparar_vibeflow(payload_vibeflow):
        resultado.alertas_enviados.append("VIBEFLOW")

    # --- Etapa 7: Status final ---
    resultado.status = (
        "OK_ALERTAS_DISPARADOS"
        if resultado.alertas_enviados
        else "AVISO_ALERTAS_COM_FALHA"
    )
    if resultado.status == "AVISO_ALERTAS_COM_FALHA":
        resultado.erro = (
            "Registros detectados mas nenhum alerta foi entregue. "
            "Verifique credenciais QAP e conectividade."
        )

    return resultado


# =============================================================================
# 11. ENTRY POINT
# =============================================================================
if __name__ == "__main__":
    resultado = executar_rotina_lgpd()

    sep = "=" * 70
    logger.info(sep)
    logger.info(f"Status final       : {resultado.status}")
    logger.info(f"Total encontrados  : {resultado.total_encontrados}")
    logger.info(f"Alertas enviados   : {resultado.alertas_enviados or 'nenhum'}")
    if resultado.erro:
        logger.error(f"Erro              : {resultado.erro}")
    logger.info(sep)

    print(json.dumps(resultado.para_dict(), ensure_ascii=False, indent=2, default=str))

    exit_codes = {
        "OK_SEM_PENDENCIAS":       0,
        "OK_ALERTAS_DISPARADOS":   0,
        "AVISO_ALERTAS_COM_FALHA": 2,
        "ERRO_BANCO":              1,
        "ERRO":                    1,
    }
    sys.exit(exit_codes.get(resultado.status, 1))
