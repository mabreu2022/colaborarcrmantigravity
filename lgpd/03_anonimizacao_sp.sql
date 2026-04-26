-- ============================================================
-- PILAR 2: Stored Procedure de Anonimização (Soft Delete LGPD)
-- Banco: Firebird 5.0
-- Compatível com: PSQL nativo do Firebird
-- ============================================================
-- Estratégia:
--   1. Substitui dados PII por strings determinísticas mas irreversíveis.
--   2. Preserva ID, chaves estrangeiras e dados financeiros/históricos.
--   3. Registra a anonimização na AUDITORIA_ACESSOS.
--   4. Campo LGPD_ANONIMIZADO marca o registro como processado.
--   5. Campo DATA_LGPD_ANONIMIZACAO registra o momento do processo.
-- ============================================================

-- Pré-requisito: Adicionar colunas de controle LGPD nas tabelas
-- (execute ANTES de criar a SP)

ALTER TABLE CLIENTES ADD LGPD_ANONIMIZADO SMALLINT DEFAULT 0 NOT NULL;
ALTER TABLE CLIENTES ADD DATA_LGPD_ANONIMIZACAO TIMESTAMP;

ALTER TABLE LEADS ADD LGPD_ANONIMIZADO SMALLINT DEFAULT 0 NOT NULL;
ALTER TABLE LEADS ADD DATA_LGPD_ANONIMIZACAO TIMESTAMP;

COMMIT;

-- ============================================================
-- PROCEDURE: LGPD_ANONIMIZAR_CLIENTE
-- ============================================================

SET TERM ^ ;

CREATE OR ALTER PROCEDURE LGPD_ANONIMIZAR_CLIENTE (
    P_CLIENTE_ID INTEGER,
    P_USUARIO_SOLICITANTE VARCHAR(100)  -- Quem solicitou (para auditoria)
)
RETURNS (
    R_STATUS VARCHAR(50),
    R_MENSAGEM VARCHAR(200)
)
AS
DECLARE VARIABLE V_HASH_BASE VARCHAR(100);
DECLARE VARIABLE V_CPF_ANON  VARCHAR(14);
DECLARE VARIABLE V_EMAIL_ANON VARCHAR(150);
DECLARE VARIABLE V_TEL_ANON  VARCHAR(20);
DECLARE VARIABLE V_NOME_ANON VARCHAR(150);
DECLARE VARIABLE V_JA_ANONIMIZADO SMALLINT;
BEGIN
    -- Verifica se já foi anonimizado (idempotência)
    SELECT LGPD_ANONIMIZADO
    FROM CLIENTES
    WHERE ID = :P_CLIENTE_ID
    INTO :V_JA_ANONIMIZADO;

    IF (V_JA_ANONIMIZADO IS NULL) THEN BEGIN
        R_STATUS = 'ERRO';
        R_MENSAGEM = 'Cliente ID ' || :P_CLIENTE_ID || ' não encontrado.';
        SUSPEND;
        EXIT;
    END

    IF (V_JA_ANONIMIZADO = 1) THEN BEGIN
        R_STATUS = 'SKIP';
        R_MENSAGEM = 'Cliente já foi anonimizado anteriormente.';
        SUSPEND;
        EXIT;
    END

    -- --------------------------------------------------------
    -- Gera identificadores anônimos determinísticos
    -- Formato: ANON_<TIPO>_<ID>_<HASH_PARCIAL>
    -- O hash parcial é derivado do ID + timestamp para ser único
    -- mas NÃO é reversível ao dado original.
    -- --------------------------------------------------------
    V_HASH_BASE = CAST(:P_CLIENTE_ID AS VARCHAR(10))
                  || '_'
                  || CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) AS VARCHAR(20));

    -- Nome: formato padronizado indicando anonimização
    V_NOME_ANON  = 'TITULAR_REMOVIDO_' || CAST(:P_CLIENTE_ID AS VARCHAR(10));

    -- CPF: substitui por formato inválido (impossível de ser real)
    V_CPF_ANON   = '000.000.000-' || LPAD(CAST(MOD(:P_CLIENTE_ID, 99) AS VARCHAR(2)), 2, '0');

    -- Email: domínio fictício reservado (RFC 2606 — .invalid)
    V_EMAIL_ANON = 'removido_' || CAST(:P_CLIENTE_ID AS VARCHAR(10)) || '@dados.invalid';

    -- Telefone: número inválido padrão ANATEL
    V_TEL_ANON   = '(00) 00000-' || LPAD(CAST(MOD(:P_CLIENTE_ID, 9999) AS VARCHAR(4)), 4, '0');

    -- --------------------------------------------------------
    -- Aplica anonimização — mantém ID, FKs e dados não-PII
    -- --------------------------------------------------------
    UPDATE CLIENTES SET
        NOME                     = :V_NOME_ANON,
        CPF                      = :V_CPF_ANON,
        EMAIL                    = :V_EMAIL_ANON,
        TELEFONE                 = :V_TEL_ANON,
        CELULAR                  = :V_TEL_ANON,
        ENDERECO                 = 'ENDEREÇO REMOVIDO',
        CEP                      = '00000-000',
        CIDADE                   = 'CIDADE REMOVIDA',
        OBSERVACOES              = 'Registro anonimizado conforme LGPD Art. 18.',
        LGPD_ANONIMIZADO         = 1,
        DATA_LGPD_ANONIMIZACAO   = CURRENT_TIMESTAMP
    WHERE ID = :P_CLIENTE_ID
      AND LGPD_ANONIMIZADO = 0;  -- Proteção dupla contra dupla execução

    -- --------------------------------------------------------
    -- Registra na tabela de auditoria imutável
    -- --------------------------------------------------------
    INSERT INTO AUDITORIA_ACESSOS (
        USUARIO_ID_STR,
        ACAO,
        TABELA_AFETADA,
        REGISTRO_ID,
        IP_ORIGEM,
        TIMESTAMP_EVENTO,
        DETALHES
    ) VALUES (
        :P_USUARIO_SOLICITANTE,
        'LGPD_ANONIMIZACAO',
        'CLIENTES',
        :P_CLIENTE_ID,
        '0.0.0.0',          -- Chamada interna via SP
        CURRENT_TIMESTAMP,
        'Dados PII substituídos conforme Art. 18 LGPD. Histórico financeiro preservado.'
    );

    R_STATUS   = 'OK';
    R_MENSAGEM = 'Cliente ' || :P_CLIENTE_ID || ' anonimizado com sucesso.';
    SUSPEND;

WHEN ANY DO BEGIN
    R_STATUS   = 'ERRO';
    R_MENSAGEM = 'Falha ao anonimizar cliente ' || :P_CLIENTE_ID || ': ' || EXCEPTION_MESSAGE;
    ROLLBACK;
    SUSPEND;
END

END^

-- ============================================================
-- PROCEDURE: LGPD_ANONIMIZAR_LEAD  
-- (Equivalente para tabela LEADS)
-- ============================================================

CREATE OR ALTER PROCEDURE LGPD_ANONIMIZAR_LEAD (
    P_LEAD_ID INTEGER,
    P_USUARIO_SOLICITANTE VARCHAR(100)
)
RETURNS (
    R_STATUS VARCHAR(50),
    R_MENSAGEM VARCHAR(200)
)
AS
DECLARE VARIABLE V_JA_ANONIMIZADO SMALLINT;
BEGIN
    SELECT LGPD_ANONIMIZADO
    FROM LEADS
    WHERE ID = :P_LEAD_ID
    INTO :V_JA_ANONIMIZADO;

    IF (V_JA_ANONIMIZADO IS NULL) THEN BEGIN
        R_STATUS = 'ERRO';
        R_MENSAGEM = 'Lead ID ' || :P_LEAD_ID || ' não encontrado.';
        SUSPEND;
        EXIT;
    END

    IF (V_JA_ANONIMIZADO = 1) THEN BEGIN
        R_STATUS = 'SKIP';
        R_MENSAGEM = 'Lead já foi anonimizado anteriormente.';
        SUSPEND;
        EXIT;
    END

    UPDATE LEADS SET
        NOME                   = 'TITULAR_REMOVIDO_' || CAST(:P_LEAD_ID AS VARCHAR(10)),
        EMAIL                  = 'removido_' || CAST(:P_LEAD_ID AS VARCHAR(10)) || '@dados.invalid',
        TELEFONE               = '(00) 00000-' || LPAD(CAST(MOD(:P_LEAD_ID, 9999) AS VARCHAR(4)), 4, '0'),
        EMPRESA                = 'EMPRESA REMOVIDA',
        OPT_IN_COMUNICACAO     = 0,
        LGPD_ANONIMIZADO       = 1,
        DATA_LGPD_ANONIMIZACAO = CURRENT_TIMESTAMP
    WHERE ID = :P_LEAD_ID
      AND LGPD_ANONIMIZADO = 0;

    INSERT INTO AUDITORIA_ACESSOS (
        USUARIO_ID_STR, ACAO, TABELA_AFETADA, REGISTRO_ID,
        IP_ORIGEM, TIMESTAMP_EVENTO, DETALHES
    ) VALUES (
        :P_USUARIO_SOLICITANTE, 'LGPD_ANONIMIZACAO', 'LEADS', :P_LEAD_ID,
        '0.0.0.0', CURRENT_TIMESTAMP,
        'Lead anonimizado conforme LGPD Art. 18.'
    );

    R_STATUS   = 'OK';
    R_MENSAGEM = 'Lead ' || :P_LEAD_ID || ' anonimizado com sucesso.';
    SUSPEND;

WHEN ANY DO BEGIN
    R_STATUS   = 'ERRO';
    R_MENSAGEM = EXCEPTION_MESSAGE;
    ROLLBACK;
    SUSPEND;
END

END^

SET TERM ; ^

COMMIT;
