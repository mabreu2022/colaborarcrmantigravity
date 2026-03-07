const db = require('./db');

async function alterContracts() {
    try {
        console.log('Testando conexão...');
        await db.testConnection();

        console.log('Adicionando coluna SLAID em CONTRATOS...');
        try {
            await db.query(`
                ALTER TABLE CONTRATOS ADD SLAID INTEGER;
            `);
            console.log('Coluna SLAID adicionada.');
        } catch (e) {
            console.log('Coluna SLAID já existe ou ocorreu um erro:', e.message);
        }

        console.log('Adicionando Foreign Key...');
        try {
            await db.query(`
                ALTER TABLE CONTRATOS
                ADD CONSTRAINT FK_CONTRATOS_SLA FOREIGN KEY (SLAID) REFERENCES SLA (ID_SLA);
            `);
            console.log('Foreign Key FK_CONTRATOS_SLA adicionada.');
        } catch (e) {
            console.log('Foreign Key já existe ou ocorreu um erro:', e.message);
        }

        console.log('Alteração completa!');
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        process.exit();
    }
}

alterContracts();
