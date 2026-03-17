const db = require('./db');

async function test() {
    try {
        console.log('--- TESTANDO QUERY COM ALIASES SEGUROS ---');
        const query = `
            SELECT CH.*, S.NOME as STATUS_NOME, A.DESCRICAO as ATIVO_NOME
            FROM CHAMADOS CH
            LEFT JOIN STATUS_CHAMADO S ON CH.ID_STATUS_CHAMADO = S.ID_STATUS_CHAMADO
            LEFT JOIN ATIVOS A ON CH.ID_ATIVO = A.ID_ATIVO
            WHERE CH.ID_CONTATO = 588
            ORDER BY CH.ID_CHAMADO DESC
        `;
        
        try {
            const result = await db.query(query);
            console.log('✓ Query com aliases seguros OK!', result.length, 'registros.');
            if (result.length > 0) {
                console.log('Primeiro registro:', JSON.stringify(result[0], null, 2));
            }
        } catch (e) {
            console.log('❌ FALHA NA QUERY SEGURA:', e.message);
        }

    } catch (err) {
        console.error('Erro fatal!', err);
    } finally {
        process.exit();
    }
}

test();
