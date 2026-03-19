const db = require('./src/server/db');

async function checkSchema() {
    try {
        console.log('--- AGENDA TABLE COLUMNS ---');
        const columns = await db.query("SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME = 'AGENDA'");
        console.log(JSON.stringify(columns.map(c => c.RDB$FIELD_NAME.trim()), null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

checkSchema();
