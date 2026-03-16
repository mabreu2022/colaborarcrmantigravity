const db = require('./db');
const fs = require('fs');

async function extractSchema() {
    try {
        const tables = ['CONTRATOS', 'STATUS_CONTRATO', 'SLA', 'CLIENTES'];
        let output = '';
        for (const table of tables) {
            output += `--- ${table} ---\n`;
            const query = `
                SELECT rf.RDB$FIELD_NAME as FIELD_NAME, f.RDB$FIELD_TYPE as FIELD_TYPE
                FROM RDB$RELATION_FIELDS rf
                JOIN RDB$FIELDS f ON rf.RDB$FIELD_SOURCE = f.RDB$FIELD_NAME
                WHERE rf.RDB$RELATION_NAME = '${table}'
            `;
            const result = await db.query(query);
            result.forEach(r => {
                output += `${r.FIELD_NAME.trim()} (Type: ${r.FIELD_TYPE})\n`;
            });
            output += '\n';
        }
        fs.writeFileSync('schema_dump.txt', output);
        console.log('Schema dumped to schema_dump.txt');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}

extractSchema();
