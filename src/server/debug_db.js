const db = require('./db');

async function debug() {
    try {
        console.log('--- DIAGNÓSTICO DE TABELAS (REFINADO) ---');
        
        const tables = ['CHAMADOS', 'CONTRATOS', 'ATIVOS', 'CONTATOS', 'STATUS_CHAMADO', 'STATUS_CONTRATO', 'ATIVOS_CONTRATO'];
        
        for (const table of tables) {
            console.log(`\nEstrutura de ${table}:`);
            try {
                const result = await db.query(`SELECT FIRST 1 * FROM ${table}`);
                if (result && result.length > 0) {
                    console.log('Colunas:', Object.keys(result[0]).join(', '));
                } else {
                    console.log('Tabela vazia ou sem dados para exibir colunas.');
                }
            } catch (e) {
                console.log('❌ Erro:', e.message);
            }
        }
        
    } catch (err) {
        console.error('Erro no diagnóstico:', err);
    } finally {
        process.exit();
    }
}

debug();
