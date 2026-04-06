const db = require('./src/server/db');

async function checkContratosSchema() {
    try {
        console.log("--- Checking CONTRATOS Table Columns ---");
        // Simple query for Firebird metadata
        const query = `
            SELECT RDB$FIELD_NAME AS FIELD_NAME
            FROM RDB$RELATION_FIELDS
            WHERE RDB$RELATION_NAME = 'CONTRATOS'
        `;
        const result = await db.query(query);
        const columns = result.map(r => r.FIELD_NAME.trim());
        console.log("Columns:", columns.join(', '));

        console.log("\n--- Checking Data Types for key columns ---");
        const typeQuery = `
            SELECT 
                RF.RDB$FIELD_NAME AS FIELD_NAME,
                F.RDB$FIELD_TYPE AS FIELD_TYPE,
                F.RDB$FIELD_LENGTH AS FIELD_LENGTH
            FROM RDB$RELATION_FIELDS RF
            JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
            WHERE RF.RDB$RELATION_NAME = 'CONTRATOS'
        `;
        const typeResult = await db.query(typeQuery);
        console.log(typeResult.map(r => ({
            name: r.FIELD_NAME.trim(),
            type: r.FIELD_TYPE,
            len: r.FIELD_LENGTH
        })));

    } catch (error) {
        console.error("Error checking schema:", error);
    } finally {
        process.exit(0);
    }
}

checkContratosSchema();
