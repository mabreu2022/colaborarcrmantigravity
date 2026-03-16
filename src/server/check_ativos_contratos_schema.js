const db = require('./db');

async function checkSchema() {
    try {
        console.log('--- Checking ATIVOS_CONTRATOS Schema ---');
        const query = `
            SELECT 
                rf.RDB$FIELD_NAME as FIELD_NAME
            FROM RDB$RELATION_FIELDS rf
            WHERE rf.RDB$RELATION_NAME = 'ATIVOS_CONTRATOS'
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
