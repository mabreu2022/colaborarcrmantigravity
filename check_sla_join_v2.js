const db = require('./src/server/db');

async function checkJoin() {
    try {
        console.log('--- UPDATED JOIN CHECK: CHAMADOS -> SLA (with Coalesce) ---');
        const query = `
            SELECT 
                C.ID_CHAMADO, C.TICKETID, C.SLAID, SLA.SLDESC as SLA_DESC
            FROM CHAMADOS C
            LEFT JOIN CONTRATOS CON ON C.ID_CONTRATO = CON.ID_CONTRATO
            LEFT JOIN SLA ON COALESCE(C.SLAID, CON.SLAID) = SLA.ID_SLA
            WHERE C.TICKETID = 'CH-000005'
        `;
        const result = await db.query(query);
        console.log(JSON.stringify(result, null, 2));

    } catch (err) {
        console.error('Erro no join check:', err);
    } finally {
        process.exit(0);
    }
}

checkJoin();
