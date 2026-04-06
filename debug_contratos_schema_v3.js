const db = require('./src/server/db');

async function checkContratosSchema() {
    try {
        console.log("--- Checking CONTRATOS Table Nullability ---");
        const query = `
            SELECT 
                RF.RDB$FIELD_NAME AS FIELD_NAME,
                RF.RDB$NULL_FLAG AS NULL_FLAG
            FROM RDB$RELATION_FIELDS RF
            WHERE RF.RDB$RELATION_NAME = 'CONTRATOS'
        `;
        const result = await db.query(query);
        console.table(result.map(r => ({
            name: r.FIELD_NAME.trim(),
            nullable: r.NULL_FLAG !== 1
        })));

    } catch (error) {
        console.error("Error checking schema:", error);
    } finally {
        process.exit(0);
    }
}

checkContratosSchema();
