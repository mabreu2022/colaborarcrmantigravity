const db = require('./db');

async function diagnose() {
    try {
        const query = `
            SELECT 
                CH.ID_CHAMADO, CH.TICKETID, CH.NUMERO_SERIE as CH_SERIAL, 
                A.NUMERO_SERIE as ATIVO_SERIAL, A.DESCRICAO as ATIVO_NOME,
                CH.ID_ATIVO, CH.DESCRICAO, S.NOME as STATUS_NOME
            FROM CHAMADOS CH
            LEFT JOIN ATIVOS A ON CH.ID_ATIVO = A.ID_ATIVO
            LEFT JOIN STATUS_CHAMADO S ON CH.ID_STATUS_CHAMADO = S.ID_STATUS_CHAMADO
            WHERE CH.TICKETID IN ('CH-000005', 'CH-000004')
        `;

        const result = await db.query(query);
        console.log('Diagnostic Result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Diagnostic error:', err);
    } finally {
        process.exit(0);
    }
}

diagnose();
