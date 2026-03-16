const db = require('./db');

async function checkSchema() {
    try {
        console.log('--- Checking CONTRATOS Field Types ---');
        const query = `
            SELECT 
                rf.RDB$FIELD_NAME as FIELD_NAME,
                f.RDB$FIELD_TYPE as FIELD_TYPE,
                f.RDB$FIELD_LENGTH as FIELD_LENGTH,
                f.RDB$FIELD_SUB_TYPE as SUB_TYPE
            FROM RDB$RELATION_FIELDS rf
            JOIN RDB$FIELDS f ON rf.RDB$FIELD_SOURCE = f.RDB$FIELD_NAME
            WHERE rf.RDB$RELATION_NAME = 'CONTRATOS'
        `;
        const result = await db.query(query);
        console.table(result.map(r => ({
            FIELD: r.FIELD_NAME.trim(),
            TYPE: r.FIELD_TYPE,
            LENGTH: r.FIELD_LENGTH,
            SUB_TYPE: r.SUB_TYPE
        })));
        // Field type 261 = BLOB
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}

checkSchema();
