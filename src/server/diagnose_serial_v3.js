const db = require('./db');

async function diagnose() {
    try {
        const contactId = 2; // Test with a common ID or provide as param
        const query = `
            SELECT 
                CH.ID_CHAMADO, CH.TICKETID, 
                COALESCE(CH.DATA_HORA, CH.DATA_ABERTURA) as DATA_ABERTURA, 
                CH.DESCRICAO, CH.DATA_PRAZO_SLA,
                COALESCE(CH.NUMERO_SERIE, A.NUMERO_SERIE) AS NUMERO_SERIE,
                S.NOME as STATUS_NOME, A.DESCRICAO as NOME_ATIVO,
                SLA.SLDESC as SLA_NOME
            FROM CHAMADOS CH
            LEFT JOIN STATUS_CHAMADO S ON CH.ID_STATUS_CHAMADO = S.ID_STATUS_CHAMADO
            LEFT JOIN ATIVOS A ON CH.ID_ATIVO = A.ID_ATIVO
            LEFT JOIN CONTRATOS C ON CH.ID_CONTRATO = C.ID_CONTRATO
            LEFT JOIN SLA ON COALESCE(CH.SLAID, C.SLAID) = SLA.ID_SLA
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
