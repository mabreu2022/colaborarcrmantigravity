const db = require('./db');

async function migrate() {
    try {
        console.log('Iniciando migração da tabela CONTATOS...');
        
        // 1. Adicionar coluna SENHA se não existir
        try {
            await db.query('ALTER TABLE CONTATOS ADD SENHA VARCHAR(100)');
            console.log('Coluna SENHA adicionada com sucesso.');
        } catch (e) {
            if (e.message.includes('already exists') || e.message.includes('unsuccessful metadata update')) {
                console.log('Coluna SENHA já existe.');
            } else {
                throw e;
            }
        }

        // 2. Definir senha padrão '123456' para quem estiver sem senha
        const result = await db.query("UPDATE CONTATOS SET SENHA = '123456' WHERE SENHA IS NULL OR SENHA = ''");
        console.log('Senhas padronizadas para contatos existentes.');

        console.log('Migração concluída com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('Erro na migração:', error);
        process.exit(1);
    }
}

migrate();
