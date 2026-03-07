const db = require('./db');

async function createSchema() {
    try {
        console.log('Testando conexão...');
        await db.testConnection();

        console.log('Criando tabela SLA...');
        try {
            await db.query(`
                CREATE TABLE SLA (
                    ID_SLA INTEGER NOT NULL PRIMARY KEY,
                    SLDESC VARCHAR(50)
                );
            `);
            console.log('Tabela SLA criada.');
        } catch (e) {
            console.log('Tabela SLA já existe ou erro:', e.message);
        }

        console.log('Criando Generator para SLA...');
        try {
            await db.query(`CREATE SEQUENCE GEN_SLA_ID;`);
            console.log('Generator GEN_SLA_ID criado.');
        } catch (e) { console.log(e.message); }

        console.log('Criando Trigger para SLA...');
        try {
            await db.query(`
                CREATE OR ALTER TRIGGER TRG_SLA_BI FOR SLA
                ACTIVE BEFORE INSERT POSITION 0
                AS
                BEGIN
                    IF (NEW.ID_SLA IS NULL) THEN
                        NEW.ID_SLA = GEN_ID(GEN_SLA_ID,1);
                END
            `);
            console.log('Trigger TRG_SLA_BI criada.');
        } catch (e) { console.log(e.message); }

        console.log('Criando tabela CHAMADOS...');
        try {
            await db.query(`
                CREATE TABLE CHAMADOS (
                    ID_CHAMADO INTEGER NOT NULL PRIMARY KEY,
                    TICKETID VARCHAR(20),
                    CODCLIENTE INTEGER,
                    NUMERO_SERIE VARCHAR(100),
                    DATA_HORA TIMESTAMP,
                    SLAID INTEGER,
                    CONSTRAINT FK_CHAMADOS_CLIENTE FOREIGN KEY (CODCLIENTE) REFERENCES CLIENTES (ID_CLIENTE),
                    CONSTRAINT FK_CHAMADOS_SLA FOREIGN KEY (SLAID) REFERENCES SLA (ID_SLA)
                );
            `);
            console.log('Tabela CHAMADOS criada.');
        } catch (e) {
            console.log('Tabela CHAMADOS já existe ou erro:', e.message);
        }

        console.log('Criando Generator para CHAMADOS...');
        try {
            await db.query(`CREATE SEQUENCE GEN_CHAMADOS_ID;`);
            console.log('Generator GEN_CHAMADOS_ID criado.');
        } catch (e) { console.log(e.message); }

        console.log('Criando Trigger para CHAMADOS...');
        try {
            await db.query(`
                CREATE OR ALTER TRIGGER TRG_CHAMADOS_BI FOR CHAMADOS
                ACTIVE BEFORE INSERT POSITION 0
                AS
                BEGIN
                    IF (NEW.ID_CHAMADO IS NULL) THEN
                        NEW.ID_CHAMADO = GEN_ID(GEN_CHAMADOS_ID,1);
                END
            `);
            console.log('Trigger TRG_CHAMADOS_BI criada.');
        } catch (e) { console.log(e.message); }

        console.log('Populando SLAs padrões...');
        try {
            await db.query(`INSERT INTO SLA (SLDESC) VALUES ('4 Horas')`);
            await db.query(`INSERT INTO SLA (SLDESC) VALUES ('8 Horas')`);
            await db.query(`INSERT INTO SLA (SLDESC) VALUES ('24 Horas')`);
            console.log('SLAs inseridos.');
        } catch (e) { console.log('SLAs já existem ou erro:', e.message); }

        console.log('Schema completo!');
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        process.exit();
    }
}

createSchema();
