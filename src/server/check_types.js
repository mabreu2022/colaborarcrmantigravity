const db = require('./db');
require('dotenv').config();

async function check() {
    try {
        console.log("Checking columns and types for FORNECEDORES...");
        const query = `
            SELECT 
                f.RDB$FIELD_NAME as FIELD_NAME,
                t.RDB$TYPE_NAME as FIELD_TYPE
            FROM RDB$RELATION_FIELDS f
            JOIN RDB$FIELDS field ON f.RDB$FIELD_SOURCE = field.RDB$FIELD_NAME
            JOIN RDB$TYPES t ON field.RDB$FIELD_TYPE = t.RDB$TYPE
            WHERE f.RDB$RELATION_NAME = 'FORNECEDORES'
            AND t.RDB$FIELD_NAME = 'RDB$FIELD_TYPE'
        `;
        const columns = await db.query(query);
        columns.forEach(c => {
            console.log(`${c.FIELD_NAME.trim()}: ${c.FIELD_TYPE.trim()}`);
        });

        process.exit(0);
    } catch (err) {
        console.error("Check failed:", err);
        process.exit(1);
    }
}

check();
