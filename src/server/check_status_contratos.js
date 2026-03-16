const db = require('./db');

async function check() {
    try {
        const result = await db.query('SELECT * FROM STATUS_CONTRATO');
        console.log(result);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();
