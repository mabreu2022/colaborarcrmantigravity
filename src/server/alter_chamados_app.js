const db = require('./db');

async function alterChamados() {
    try {
        console.log('Testando conexão...');
        await db.testConnection();

        // 1. Column: DESCRICAO
        console.log('Adicionando coluna DESCRICAO em CHAMADOS...');
        try {
            await db.query(`ALTER TABLE CHAMADOS ADD DESCRICAO BLOB SUB_TYPE TEXT;`);
            console.log('Coluna DESCRICAO adicionada.');
        } catch (e) { console.log('Coluna DESCRICAO já existe ou ignorada:', e.message); }

        // 2. Column: URGENCIA
        console.log('Adicionando coluna URGENCIA em CHAMADOS...');
        try {
            await db.query(`ALTER TABLE CHAMADOS ADD URGENCIA VARCHAR(15);`);
            console.log('Coluna URGENCIA adicionada.');
        } catch (e) { console.log('Coluna URGENCIA já existe ou ignorada:', e.message); }

        // 3. Column: ID_STATUS
        console.log('Adicionando coluna ID_STATUS em CHAMADOS...');
        try {
            await db.query(`ALTER TABLE CHAMADOS ADD ID_STATUS INTEGER;`);
            console.log('Coluna ID_STATUS adicionada.');
        } catch (e) { console.log('Coluna ID_STATUS já existe ou ignorada:', e.message); }

        try {
            await db.query(`ALTER TABLE CHAMADOS ADD CONSTRAINT FK_CHAMADOS_STATUS FOREIGN KEY (ID_STATUS) REFERENCES STATUS (ID_STATUS);`);
            console.log('Foreign Key FK_CHAMADOS_STATUS adicionada.');
        } catch (e) { console.log('FK_CHAMADOS_STATUS já existe ou ignorada:', e.message); }

        // 4. Column: ID_CONTATO
        console.log('Adicionando coluna ID_CONTATO em CHAMADOS...');
        try {
            await db.query(`ALTER TABLE CHAMADOS ADD ID_CONTATO INTEGER;`);
            console.log('Coluna ID_CONTATO adicionada.');
        } catch (e) { console.log('Coluna ID_CONTATO já existe ou ignorada:', e.message); }

        try {
            await db.query(`ALTER TABLE CHAMADOS ADD CONSTRAINT FK_CHAMADOS_CONTATO FOREIGN KEY (ID_CONTATO) REFERENCES CONTATOS (ID_CONTATO);`);
            console.log('Foreign Key FK_CHAMADOS_CONTATO adicionada.');
        } catch (e) { console.log('FK_CHAMADOS_CONTATO já existe ou ignorada:', e.message); }

        // 5. Column: ID_ATIVO
        console.log('Adicionando coluna ID_ATIVO em CHAMADOS...');
        try {
            await db.query(`ALTER TABLE CHAMADOS ADD ID_ATIVO INTEGER;`);
            console.log('Coluna ID_ATIVO adicionada.');
        } catch (e) { console.log('Coluna ID_ATIVO já existe ou ignorada:', e.message); }

        try {
            await db.query(`ALTER TABLE CHAMADOS ADD CONSTRAINT FK_CHAMADOS_ATIVO FOREIGN KEY (ID_ATIVO) REFERENCES ATIVOS (ID_ATIVO);`);
            console.log('Foreign Key FK_CHAMADOS_ATIVO adicionada.');
        } catch (e) { console.log('FK_CHAMADOS_ATIVO já existe ou ignorada:', e.message); }

        // 6. Column: ID_TECNICO
        console.log('Adicionando coluna ID_TECNICO em CHAMADOS...');
        try {
            await db.query(`ALTER TABLE CHAMADOS ADD ID_TECNICO INTEGER;`);
            console.log('Coluna ID_TECNICO adicionada.');
        } catch (e) { console.log('Coluna ID_TECNICO já existe ou ignorada:', e.message); }

        try {
            await db.query(`ALTER TABLE CHAMADOS ADD CONSTRAINT FK_CHAMADOS_TECNICO FOREIGN KEY (ID_TECNICO) REFERENCES TECNICOS (ID_TECNICO);`);
            console.log('Foreign Key FK_CHAMADOS_TECNICO adicionada.');
        } catch (e) { console.log('FK_CHAMADOS_TECNICO já existe ou ignorada:', e.message); }


        console.log('Atualização do Schema completa para CHAMADOS App Integration!');
    } catch (err) {
        console.error('Erro Fatal:', err);
    } finally {
        process.exit();
    }
}

alterChamados();
