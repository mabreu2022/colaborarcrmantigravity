const db = require('./src/server/db');

async function diagnose() {
    try {
        console.log('--- SLA TABLE DATA ---');
        const slas = await db.query('SELECT * FROM SLA');
        console.log(JSON.stringify(slas, null, 2));

        console.log('\n--- CONTRACTS WITH SLAID = 1 ---');
        const contratos = await db.query('SELECT ID_CONTRATO, DESCRICAO, SLAID FROM CONTRATOS WHERE SLAID = 1');
        console.log(JSON.stringify(contratos, null, 2));

        console.log('\n--- TICKETS WITH SLAID = 1 ---');
        const chamados = await db.query('SELECT ID_CHAMADO, TICKETID, SLAID FROM CHAMADOS WHERE SLAID = 1');
        console.log(JSON.stringify(chamados, null, 2));

    } catch (err) {
        console.error('Erro no diagnóstico:', err);
    } finally {
        process.exit(0);
    }
}

diagnose();
