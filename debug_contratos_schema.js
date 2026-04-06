const db = require('./src/server/db');

async function checkContratosSchema() {
    try {
        console.log("--- Checking CONTRATOS Table Schema ---");
        const query = `
            SELECT 
                RF.RDB$FIELD_NAME AS FIELD_NAME,
                F.RDB$FIELD_TYPE AS FIELD_TYPE,
                F.RDB$FIELD_LENGTH AS FIELD_LENGTH,
                F.RDB$CHARACTER_LENGTH AS CHAR_LENGTH,
                RF.RDB$NULL_FLAG AS NULL_FLAG
            FROM RDB$RELATION_FIELDS RF
            JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
            WHERE RF.RDB$RELATION_NAME = 'CONTRATOS'
            ORDER BY RF.RDB$FIELD_POSITION
        `;
        const result = await db.query(query);
        console.table(result.map(r => ({
            FIELD: r.FIELD_NAME.trim(),
            TYPE: r.FIELD_TYPE,
            LEN: r.FIELD_LENGTH,
            CHAR_LEN: r.CHAR_LENGTH,
            NULLABLE: r.NULL_FLAG !== 1
        })));

        console.log("\n--- Checking Sample Data ---");
        const sample = await db.query("SELECT FIRST 1 * FROM CONTRATOS");
        console.log("Sample Row:", sample[0]);

    } catch (error) {
        console.error("Error checking schema:", error);
    } finally {
        // Since db.js uses a pool, we might need to close it or just let the process exit
        process.exit(0);
    }
}

checkContratosSchema();
