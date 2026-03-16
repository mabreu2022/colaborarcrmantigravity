const db = require('./db');

async function checkSchema() {
    try {
        console.log('--- Checking ATIVOS Field Types ---');
        const query = `
            SELECT 
                rf.RDB$FIELD_NAME as FIELD_NAME,
                f.RDB$FIELD_TYPE as FIELD_TYPE
            FROM RDB$RELATION_FIELDS rf
            JOIN RDB$FIELDS f ON rf.RDB$FIELD_SOURCE = f.RDB$FIELD_NAME
            WHERE rf.RDB$RELATION_NAME = 'ATIVOS'
        `;
        const result = await db.query(query);
        console.log(result.map(r => r.FIELD_NAME.trim()));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}

checkSchema();
