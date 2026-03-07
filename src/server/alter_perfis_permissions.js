const db = require('./db');
const nodeFirebird = require('node-firebird');

async function migrate() {
    console.log('Testando conexão...');
    try {
        const columns = [
            'CAN_DASHBOARD',
            'CAN_CLIENTS',
            'CAN_CHAMADOS',
            'CAN_CONTRACTS',
            'CAN_ASSETS',
            'CAN_AGENDA',
            'CAN_USERS',
            'CAN_TECNICOS',
            'CAN_ESPECIALIDADES',
            'CAN_ESTOQUE',
            'CAN_FORNECEDORES',
            'CAN_REPORTS',
            'CAN_SETTINGS'
        ];

        for (const col of columns) {
            console.log(`Adicionando coluna ${col} em PERFIS...`);
            try {
                // We use a try-catch for each column in case some already exist
                await db.query(`ALTER TABLE PERFIS ADD ${col} INTEGER DEFAULT 1`);
                console.log(`Coluna ${col} adicionada com sucesso.`);
            } catch (err) {
                if (err.message.includes('already exists') || err.message.includes('Violation of PRIMARY or UNIQUE KEY constraint')) {
                    console.log(`Coluna ${col} já existe.`);
                } else {
                    console.error(`Erro ao adicionar ${col}:`, err.message);
                }
            }
        }

        console.log('Alteração completa!');
        process.exit(0);
    } catch (error) {
        console.error('Erro na migração:', error);
        process.exit(1);
    }
}

migrate();
