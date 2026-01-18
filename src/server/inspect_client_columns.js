const db = require('./db');
require('dotenv').config({ path: 'src/server/.env' });

async function inspectColumns() {
    try {
        console.log("--- Inspecting CLIENTES Columns ---");
        // Fetch one row to see keys
        const result = await db.query('SELECT FIRST 1 * FROM CLIENTES');

        if (result.length > 0) {
            console.log("Column Names found:", Object.keys(result[0]));
            // Also print values to see if we spot 'SP' or similar in a different column
            console.log("Sample Row:", result[0]);
        } else {
            // If empty, we can try to query RDB$RELATION_FIELDS
            console.log("Table is empty, checking metadata...");
            const schemaQuery = `
                SELECT RDB$FIELD_NAME
                FROM RDB$RELATION_FIELDS
                WHERE RDB$RELATION_NAME = 'CLIENTES'
                ORDER BY RDB$FIELD_POSITION
             `;
            const fields = await db.query(schemaQuery);
            console.log("Metadata Columns:", fields.map(f => f.RDB$FIELD_NAME.trim()));
        }

        db.detach();

    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

inspectColumns();
