const db = require('./src/server/db');

async function diagnose() {
    try {
        console.log('--- TABLES ---');
        const tables = await db.query("SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0");
        console.log(JSON.stringify(tables, null, 2));

    } catch (err) {
        console.error('Erro no diagnóstico:', err);
    } finally {
        process.exit(0);
    }
}

diagnose();
