const db = require('./src/server/db');

async function checkSchema() {
    try {
        console.log('--- AGENDAMENTO TABLE COLUMNS ---');
        const columns = await db.query("SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME = 'AGENDAMENTO'");
        console.log(JSON.stringify(columns, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

checkSchema();
