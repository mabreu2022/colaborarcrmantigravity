const db = require('./src/server/db');

async function diagnose() {
    try {
        console.log('--- TICKET CH-000005 DATA ---');
        const ticket = await db.query("SELECT ID_CHAMADO, TICKETID, SLAID, CODCLIENTE, ID_CONTRATO FROM CHAMADOS WHERE TICKETID = 'CH-000005'");
        console.log(JSON.stringify(ticket, null, 2));

    } catch (err) {
        console.error('Erro no diagnóstico:', err);
    } finally {
        process.exit(0);
    }
}

diagnose();
