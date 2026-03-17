/**
 * Migration: Módulo de Chamados Técnicos (v2)
 * 
 * O que este script faz:
 * 1. Cria tabela STATUS_CHAMADO (status exclusivos para chamados)
 * 2. Cria tabela HISTORICO_CHAMADOS (log de interações por chamado)
 * 3. Adiciona colunas faltantes em CHAMADOS
 * 4. Popula STATUS_CHAMADO com valores padrão
 * 
 * Execute com: node src/server/migration_chamados_v2.js
 */

const db = require('./db');

async function migrate() {
    try {
        console.log('=== Migration: Módulo de Chamados v2 ===\n');
        await db.testConnection();
        console.log('✓ Conexão OK\n');

        // -------------------------------------------------------
        // 1. Criar tabela STATUS_CHAMADO
        // -------------------------------------------------------
        console.log('[1/7] Criando tabela STATUS_CHAMADO...');
        try {
            await db.query(`
                CREATE TABLE STATUS_CHAMADO (
                    ID_STATUS_CHAMADO INTEGER NOT NULL PRIMARY KEY,
                    NOME              VARCHAR(50)  NOT NULL,
                    COR               VARCHAR(10),
                    ENCERRA           CHAR(1) DEFAULT 'N'
                )
            `);
            console.log('  ✓ Tabela STATUS_CHAMADO criada.');
        } catch (e) { console.log('  ~ STATUS_CHAMADO já existe ou erro:', e.message); }

        try {
            await db.query(`CREATE SEQUENCE GEN_STATUS_CHAMADO_ID`);
        } catch (e) { /* ignora */ }

        try {
            await db.query(`
                CREATE OR ALTER TRIGGER TRG_STATUS_CHAMADO_BI FOR STATUS_CHAMADO
                ACTIVE BEFORE INSERT POSITION 0
                AS BEGIN
                    IF (NEW.ID_STATUS_CHAMADO IS NULL) THEN
                        NEW.ID_STATUS_CHAMADO = GEN_ID(GEN_STATUS_CHAMADO_ID, 1);
                END
            `);
        } catch (e) { /* ignora */ }

        // -------------------------------------------------------
        // 2. Popular STATUS_CHAMADO com valores padrão
        // -------------------------------------------------------
        console.log('\n[2/7] Populando STATUS_CHAMADO...');
        const statuses = [
            { nome: 'Aberto',              cor: '#3B82F6', encerra: 'N' },
            { nome: 'Em Atendimento',      cor: '#F59E0B', encerra: 'N' },
            { nome: 'Aguardando Peça',     cor: '#8B5CF6', encerra: 'N' },
            { nome: 'Aguardando Cliente',  cor: '#6B7280', encerra: 'N' },
            { nome: 'Encerrado',           cor: '#10B981', encerra: 'S' },
            { nome: 'Cancelado',           cor: '#EF4444', encerra: 'S' },
        ];
        for (const s of statuses) {
            try {
                // Verificar se já existe pelo nome para evitar duplicatas em re-execução
                const exists = await db.query('SELECT ID_STATUS_CHAMADO FROM STATUS_CHAMADO WHERE NOME = ?', [s.nome]);
                if (exists.length === 0) {
                    await db.query(
                        `INSERT INTO STATUS_CHAMADO (NOME, COR, ENCERRA) VALUES (?, ?, ?)`,
                        [s.nome, s.cor, s.encerra]
                    );
                    console.log(`  ✓ Status "${s.nome}" inserido.`);
                } else {
                    console.log(`  ~ Status "${s.nome}" já existe.`);
                }
            } catch (e) { console.log(`  ~ Erro ao inserir status "${s.nome}":`, e.message); }
        }

        // -------------------------------------------------------
        // 3. Criar tabela HISTORICO_CHAMADOS
        // -------------------------------------------------------
        console.log('\n[3/7] Criando tabela HISTORICO_CHAMADOS...');
        try {
            await db.query(`
                CREATE TABLE HISTORICO_CHAMADOS (
                    ID_HISTORICO  INTEGER   NOT NULL PRIMARY KEY,
                    ID_CHAMADO    INTEGER   NOT NULL,
                    ID_USUARIO    INTEGER,
                    ID_TECNICO    INTEGER,
                    DATA_HORA     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    TIPO          VARCHAR(20),
                    DESCRICAO     BLOB SUB_TYPE TEXT,
                    CONSTRAINT FK_HIST_CHAMADO  FOREIGN KEY (ID_CHAMADO)  REFERENCES CHAMADOS (ID_CHAMADO),
                    CONSTRAINT FK_HIST_USUARIO  FOREIGN KEY (ID_USUARIO)  REFERENCES USUARIOS (ID_USUARIO),
                    CONSTRAINT FK_HIST_TECNICO  FOREIGN KEY (ID_TECNICO)  REFERENCES TECNICOS (ID_TECNICO)
                )
            `);
            console.log('  ✓ Tabela HISTORICO_CHAMADOS criada.');
        } catch (e) { console.log('  ~ HISTORICO_CHAMADOS já existe ou erro:', e.message); }

        try { await db.query(`CREATE SEQUENCE GEN_HISTORICO_CHAMADOS_ID`); } catch (e) { /* ignora */ }

        try {
            await db.query(`
                CREATE OR ALTER TRIGGER TRG_HISTORICO_CHAMADOS_BI FOR HISTORICO_CHAMADOS
                ACTIVE BEFORE INSERT POSITION 0
                AS BEGIN
                    IF (NEW.ID_HISTORICO IS NULL) THEN
                        NEW.ID_HISTORICO = GEN_ID(GEN_HISTORICO_CHAMADOS_ID, 1);
                END
            `);
        } catch (e) { /* ignora */ }

        // -------------------------------------------------------
        // 4. Adicionar colunas faltantes em CHAMADOS
        // -------------------------------------------------------
        console.log('\n[4/7] Adicionando colunas em CHAMADOS...');
        const alterColumns = [
            [`ALTER TABLE CHAMADOS ADD ID_CLIENTE INTEGER`,               'ID_CLIENTE'],
            [`ALTER TABLE CHAMADOS ADD ID_CONTATO INTEGER`,               'ID_CONTATO'],
            [`ALTER TABLE CHAMADOS ADD ID_CONTRATO INTEGER`,              'ID_CONTRATO'],
            [`ALTER TABLE CHAMADOS ADD ID_ATIVO INTEGER`,                 'ID_ATIVO'],
            [`ALTER TABLE CHAMADOS ADD ID_STATUS_CHAMADO INTEGER`,        'ID_STATUS_CHAMADO'],
            [`ALTER TABLE CHAMADOS ADD DATA_ABERTURA TIMESTAMP`,          'DATA_ABERTURA'],
            [`ALTER TABLE CHAMADOS ADD DATA_FECHAMENTO TIMESTAMP`,        'DATA_FECHAMENTO'],
            [`ALTER TABLE CHAMADOS ADD DATA_PRAZO_SLA TIMESTAMP`,        'DATA_PRAZO_SLA'],
            [`ALTER TABLE CHAMADOS ADD RESOLUCAO BLOB SUB_TYPE TEXT`,    'RESOLUCAO'],
            [`ALTER TABLE CHAMADOS ADD DATA_MODIFICACAO TIMESTAMP`,       'DATA_MODIFICACAO'],
            [`ALTER TABLE CHAMADOS ADD FASE VARCHAR(50)`,                'FASE'],
            [`ALTER TABLE CHAMADOS ADD ORIGEM VARCHAR(50)`,              'ORIGEM'],
            [`ALTER TABLE CHAMADOS ADD DESCRICAO BLOB SUB_TYPE TEXT`,     'DESCRICAO'],
        ];
        for (const [sql, col] of alterColumns) {
            try {
                await db.query(sql);
                console.log(`  ✓ Coluna ${col} adicionada.`);
            } catch (e) { console.log(`  ~ ${col} já existe ou erro:`, e.message); }
        }

        // -------------------------------------------------------
        // 5. Adicionar FKs em CHAMADOS
        // -------------------------------------------------------
        console.log('\n[5/7] Adicionando FKs em CHAMADOS...');
        const fks = [
            [`ALTER TABLE CHAMADOS ADD CONSTRAINT FK_CHAMADOS_CONTRATO FOREIGN KEY (ID_CONTRATO) REFERENCES CONTRATOS (ID_CONTRATO)`, 'FK_CHAMADOS_CONTRATO'],
            [`ALTER TABLE CHAMADOS ADD CONSTRAINT FK_CHAMADOS_STATUS_CH FOREIGN KEY (ID_STATUS_CHAMADO) REFERENCES STATUS_CHAMADO (ID_STATUS_CHAMADO)`, 'FK_CHAMADOS_STATUS_CH'],
        ];
        for (const [sql, fk] of fks) {
            try {
                await db.query(sql);
                console.log(`  ✓ FK ${fk} adicionada.`);
            } catch (e) { console.log(`  ~ ${fk} erro/já existe:`, e.message); }
        }

        // -------------------------------------------------------
        // 6. Criar Sequência para geração de Ticket
        // -------------------------------------------------------
        console.log('\n[6/7] Criando sequência GEN_TICKET_ID...');
        try {
            await db.query(`CREATE SEQUENCE GEN_TICKET_ID`);
            console.log('  ✓ Sequência GEN_TICKET_ID criada.');
        } catch (e) { console.log('  ~ GEN_TICKET_ID já existe ou erro:', e.message); }

        // -------------------------------------------------------
        // 7. Atualizar status padrão dos chamados existentes
        // -------------------------------------------------------
        console.log('\n[7/8] Atualizando chamados existentes...');
        try {
            const statusAberto = await db.query(
                `SELECT FIRST 1 ID_STATUS_CHAMADO FROM STATUS_CHAMADO WHERE NOME = 'Aberto'`
            );
            if (statusAberto && statusAberto.length > 0) {
                await db.query(
                    `UPDATE CHAMADOS SET ID_STATUS_CHAMADO = ? WHERE ID_STATUS_CHAMADO IS NULL`,
                    [statusAberto[0].ID_STATUS_CHAMADO]
                );
                console.log('  ✓ Chamados existentes atualizados com status "Aberto".');
            }
        } catch (e) { console.log('  ~ Atualização erro:', e.message); }

        // -------------------------------------------------------
        // 8. Criar Trigger para TICKETID automático
        // -------------------------------------------------------
        console.log('\n[8/8] Criando trigger para TICKETID...');
        try {
            await db.query(`
                CREATE OR ALTER TRIGGER TRG_CHAMADOS_TICKETID FOR CHAMADOS
                ACTIVE BEFORE INSERT POSITION 1
                AS
                BEGIN
                    IF (NEW.TICKETID IS NULL OR NEW.TICKETID = '') THEN
                        NEW.TICKETID = 'CH-' || LPAD(GEN_ID(GEN_TICKET_ID, 1), 6, '0');
                END
            `);
            console.log('  ✓ Trigger TRG_CHAMADOS_TICKETID criada/atualizada.');
        } catch (e) { console.log('  ~ Erro ao criar trigger TICKETID:', e.message); }

        console.log('\n=== Migration concluída com sucesso! ===');

    } catch (err) {
        console.error('\n❌ Erro fatal na migration:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
