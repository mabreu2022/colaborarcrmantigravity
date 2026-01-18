const db = require('./db');
require('dotenv').config();

async function checkColumns() {
    try {
        console.log("--- Checking CONTRATOS Columns ---");
        // Firebird specific system table query
        const query = `
            SELECT RDB$FIELD_NAME 
            FROM RDB$RELATION_FIELDS 
            WHERE RDB$RELATION_NAME = 'CONTRATOS'
        `;

        const res = await db.query(query);
        const columns = res.map(r => r.RDB$FIELD_NAME.trim());
        console.log("Columns:", columns);

        if (columns.includes('DESCRICAO')) {
            console.log("DESCRICAO column EXISTS.");
        } else {
            console.log("DESCRICAO column is MISSING.");
        }
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkColumns();
