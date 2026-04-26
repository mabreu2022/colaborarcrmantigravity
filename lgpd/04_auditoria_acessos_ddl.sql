-- ============================================================
-- PILAR 3: Tabela de Auditoria Imutável — DDL Firebird 5.0
-- Arquivo: 04_auditoria_acessos_ddl.sql
-- ============================================================
-- Princípios de imutabilidade aplicados:
--   1. Sem UPDATE: Role específica sem permissão de UPDATE/DELETE
--   2. Sem DELETE: Negado via GRANT + trigger de proteção
--   3. BEFORE UPDATE/DELETE trigger bloqueia qualquer modificação
--   4. Sequência de ID garantida por GENERATOR (nunca reciclado)
-- ============================================================

-- Generator (Sequence) para ID auto-incremento
CREATE GENERATOR GEN_AUDITORIA_ACESSOS_ID;
ALTER SEQUENCE GEN_AUDITORIA_ACESSOS_ID START WITH 1 INCREMENT BY 1;

COMMIT;

-- ============================================================
-- Tabela principal de auditoria
-- ============================================================
CREATE TABLE AUDITORIA_ACESSOS (
    -- Chave primária imutável gerada por trigger
    ID                  INTEGER       NOT NULL,

    -- Identificação do ator (usuário do sistema)
    USUARIO_ID          INTEGER,                      -- FK para tabela de usuários (nullable para eventos anônimos)
    USUARIO_ID_STR      VARCHAR(100),                 -- Login/email como string (redundância para imutabilidade)

    -- O que aconteceu
    ACAO                VARCHAR(100)  NOT NULL,        -- Ex: SELECT_PII, UPDATE_CLIENTE, LGPD_ANONIMIZACAO, LOGIN
    TABELA_AFETADA      VARCHAR(100),                  -- Ex: CLIENTES, LEADS
    REGISTRO_ID         INTEGER,                       -- ID do registro afetado na tabela

    -- Contexto da requisição
    ROTA_HTTP           VARCHAR(255),                  -- Ex: GET /api/clientes/42
    METODO_HTTP         VARCHAR(10),                   -- Ex: GET, POST, PUT, DELETE
    IP_ORIGEM           VARCHAR(45)   NOT NULL,        -- Suporta IPv4 e IPv6

    -- Timestamp imutável (gerado pelo banco, não pela aplicação)
    TIMESTAMP_EVENTO    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Detalhes extras (payload JSON ou texto livre)
    DETALHES            BLOB SUB_TYPE TEXT,

    -- Resultado da operação
    HTTP_STATUS_CODE    SMALLINT,                      -- Ex: 200, 401, 403, 500
    SUCESSO             SMALLINT      DEFAULT 1,       -- 1=Sucesso, 0=Falha

    CONSTRAINT PK_AUDITORIA_ACESSOS PRIMARY KEY (ID)
);

COMMIT;

-- ============================================================
-- Índices para queries de relatório LGPD (performance)
-- ============================================================

-- Busca por usuário (relatório "quem acessou o quê")
CREATE INDEX IDX_AUDITORIA_USUARIO     ON AUDITORIA_ACESSOS (USUARIO_ID);

-- Busca temporal (relatório de período)
CREATE INDEX IDX_AUDITORIA_TIMESTAMP   ON AUDITORIA_ACESSOS (TIMESTAMP_EVENTO);

-- Busca por ação (relatório de tipo de acesso)
CREATE INDEX IDX_AUDITORIA_ACAO        ON AUDITORIA_ACESSOS (ACAO);

-- Busca por tabela + registro (histórico de um dado específico)
CREATE INDEX IDX_AUDITORIA_TABELA_REG  ON AUDITORIA_ACESSOS (TABELA_AFETADA, REGISTRO_ID);

-- Busca por IP (investigação de segurança)
CREATE INDEX IDX_AUDITORIA_IP          ON AUDITORIA_ACESSOS (IP_ORIGEM);

COMMIT;

-- ============================================================
-- TRIGGER: Auto-incremento do ID via Generator
-- ============================================================
SET TERM ^ ;

CREATE OR ALTER TRIGGER TRG_AUDITORIA_ACESSOS_BI
    FOR AUDITORIA_ACESSOS
    ACTIVE BEFORE INSERT
    POSITION 0
AS
BEGIN
    IF (NEW.ID IS NULL OR NEW.ID = 0) THEN
        NEW.ID = NEXT VALUE FOR GEN_AUDITORIA_ACESSOS_ID;

    -- Força timestamp pelo banco (ignora valor da aplicação se enviado)
    NEW.TIMESTAMP_EVENTO = CURRENT_TIMESTAMP;
END^

-- ============================================================
-- TRIGGER: Proteção de Imutabilidade — BLOQUEIA UPDATE
-- Nenhum registro de auditoria pode ser modificado.
-- ============================================================
CREATE OR ALTER TRIGGER TRG_AUDITORIA_BLOQUEIA_UPDATE
    FOR AUDITORIA_ACESSOS
    ACTIVE BEFORE UPDATE
    POSITION 0
AS
BEGIN
    EXCEPTION;  -- Firebird: lança exceção genérica imediatamente
    -- Alternativa explícita com mensagem:
    -- EXCEPTION E_REGISTRO_IMUTAVEL 'Registros de auditoria são imutáveis (LGPD).';
END^

-- ============================================================
-- TRIGGER: Proteção de Imutabilidade — BLOQUEIA DELETE
-- ============================================================
CREATE OR ALTER TRIGGER TRG_AUDITORIA_BLOQUEIA_DELETE
    FOR AUDITORIA_ACESSOS
    ACTIVE BEFORE DELETE
    POSITION 0
AS
BEGIN
    EXCEPTION;  -- Lança exceção bloqueando o DELETE
END^

SET TERM ; ^

COMMIT;

-- ============================================================
-- GRANTS: Permissões mínimas (Princípio do Menor Privilégio)
-- Execute como SYSDBA
-- ============================================================

-- Role de auditoria: só pode inserir e ler
CREATE ROLE ROLE_AUDITORIA_RW;
GRANT INSERT, SELECT ON AUDITORIA_ACESSOS TO ROLE_AUDITORIA_RW;

-- Role de DPO/Admin: só leitura
CREATE ROLE ROLE_DPO_READONLY;
GRANT SELECT ON AUDITORIA_ACESSOS TO ROLE_DPO_READONLY;

-- Atribuir role ao usuário que a aplicação Node.js usa
-- (substitua APP_USER pelo usuário real do Firebird)
GRANT ROLE_AUDITORIA_RW TO APP_USER;

COMMIT;

-- ============================================================
-- VIEW auxiliar para relatório LGPD (últimos 90 dias)
-- ============================================================
CREATE OR ALTER VIEW VW_AUDITORIA_LGPD_90D AS
SELECT
    A.ID,
    A.USUARIO_ID_STR,
    A.ACAO,
    A.TABELA_AFETADA,
    A.REGISTRO_ID,
    A.ROTA_HTTP,
    A.IP_ORIGEM,
    A.TIMESTAMP_EVENTO,
    A.SUCESSO,
    A.HTTP_STATUS_CODE
FROM AUDITORIA_ACESSOS A
WHERE A.TIMESTAMP_EVENTO >= DATEADD(-90 DAY TO CURRENT_TIMESTAMP)
ORDER BY A.TIMESTAMP_EVENTO DESC;

COMMIT;
