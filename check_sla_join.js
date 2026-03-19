const db = require('./src/server/db');

async function checkJoin() {
    try {
        console.log('--- JOIN CHECK: CHAMADOS -> SLA ---');
        const query = `
            SELECT 
                C.ID_CHAMADO, C.TICKETID, C.SLAID, SLA.SLDESC, CON.SLAID as CONT_SLAID, CON_SLA.SLDESC as CONT_SLA_DESC
            FROM CHAMADOS C
            LEFT JOIN SLA ON C.SLAID = SLA.ID_SLA
            LEFT JOIN CONTRATOS CON ON C.ID_CONTRATO = CON.ID_CONTRATO
            LEFT JOIN SLA CON_SLA ON CON.SLAID = CON_SLA.ID_SLA
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
