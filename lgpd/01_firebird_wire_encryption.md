# Pilar 1-A: Wire Encryption no Firebird 5.0

## Visão Geral
O Firebird 5.0 possui suporte nativo a Wire Encryption via plugins ChaCha e Arc4.
O objetivo é garantir que TODO tráfego entre aplicação Node.js/Python e o banco seja criptografado em trânsito.

---

## Passo 1 — Configurar `firebird.conf`

Localize o arquivo `firebird.conf` (geralmente em `C:\Program Files\Firebird\Firebird_5_0\`).

```ini
# ============================================================
# SEÇÃO DE SEGURANÇA — Wire Encryption (LGPD Compliance)
# ============================================================

# Obriga criptografia em todas as conexões. 
# Valores: Required | Enabled | Disabled
WireCrypt = Required

# Plugin preferido (ChaCha20 é mais moderno e performático que Arc4)
# ChaCha é nativo no Firebird 5.0 — não requer instalação adicional
WireCryptPlugin = ChaCha

# Autenticação moderna — garante troca de chaves segura (SRP256 > SRP)
AuthServer = Srp256, Srp, Win_Sspi

# Plugin de autenticação do lado do cliente (deve espelhar o servidor)
AuthClient = Srp256, Srp, Win_Sspi
```

> ⚠️ ATENÇÃO: Ao definir `WireCrypt = Required`, conexões sem suporte a
> criptografia serão RECUSADAS. Teste em ambiente de homologação antes.

---

## Passo 2 — Configurar `databases.conf` (por banco)

```ini
# Restrição por banco de dados específico
colaborarcrm {
    WireCrypt = Required
    AuthServer = Srp256, Srp
}
```

---

## Passo 3 — Reiniciar o serviço Firebird

```powershell
# PowerShell (como Administrador)
Stop-Service -Name "FirebirdServerDefaultInstance" -Force
Start-Service -Name "FirebirdServerDefaultInstance"

# Verificar status
Get-Service -Name "FirebirdServerDefault*"
```

---

## Passo 4 — Validar criptografia ativa via isql

```bash
# Conectar com isql e verificar
isql -user SYSDBA -password sua_senha localhost:C:\caminho\colaborarcrm.fdb

# Dentro do isql, executar:
SELECT MON$WIRE_CRYPT, MON$AUTH_METHOD
FROM MON$ATTACHMENTS
WHERE MON$ATTACHMENT_ID = CURRENT_CONNECTION;
```

Resultado esperado:
```
MON$WIRE_CRYPT  MON$AUTH_METHOD
--------------  ---------------
TRUE            Srp256
```

---

## Passo 5 — Ajustar o Node.js (`node-firebird`)

O pacote `node-firebird` suporta Wire Encryption automaticamente quando o servidor
exige. Certifique-se de que a versão instalada é compatível:

```bash
cd src/server
npm show node-firebird version
# Versão recomendada: >= 1.1.0
```

Adicione ao `db.js` a configuração explícita de criptografia:

```javascript
const options = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3050,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    lowercase_keys: false,
    role: null,
    pageSize: 4096,
    // Wire Encryption — exigido pelo servidor após configuração
    // node-firebird negocia automaticamente via protocolo v16+
    retryConnectionInterval: 1000,
    blobAsText: false
};
```
