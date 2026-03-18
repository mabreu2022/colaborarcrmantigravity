const db = require('./db');

async function diagnose() {
    try {
        const query = `
            SELECT 
                CH.ID_CHAMADO, CH.TICKETID, CH.ID_CONTATO, C.NOME_CONTATO
            FROM CHAMADOS CH
            LEFT JOIN CONTATOS C ON CH.ID_CONTATO = C.ID_CONTATO
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
