const db = require('./src/server/db');

async function diagnose() {
    try {
        console.log('--- SLA TABLE FULL DATA ---');
        const slas = await db.query('SELECT * FROM SLA');
        console.log(JSON.stringify(slas, null, 2));

    } catch (err) {
        console.error('Erro no diagnóstico:', err);
    } finally {
        process.exit(0);
    }
}

diagnose();
