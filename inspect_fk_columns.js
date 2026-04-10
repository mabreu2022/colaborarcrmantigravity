const db = require('./src/server/db');

async function checkAllRefColumns() {
    try {
        console.log("--- Inspecting Foreign Key Columns for CLIENTES references ---");
        const query = `
            SELECT 
                C.RDB$RELATION_NAME as TABLE_NAME,
                C.RDB$CONSTRAINT_NAME as CONSTRAINT_NAME,
                S.RDB$FIELD_NAME as FIELD_NAME
            FROM RDB$INDEX_SEGMENTS S
            JOIN RDB$RELATION_CONSTRAINTS C ON S.RDB$INDEX_NAME = C.RDB$INDEX_NAME
            JOIN RDB$REF_CONSTRAINTS RF ON C.RDB$CONSTRAINT_NAME = RF.RDB$CONSTRAINT_NAME
            WHERE RF.RDB$CONST_NAME_UQ = (
                SELECT RDB$CONSTRAINT_NAME 
                FROM RDB$RELATION_CONSTRAINTS 
                WHERE RDB$RELATION_NAME = 'CLIENTES' AND RDB$CONSTRAINT_TYPE = 'PRIMARY KEY'
            )
        `;
        const result = await db.query(query);
        const columnMap = result.map(r => ({ 
            TABLE: r.TABLE_NAME.trim(), 
            CONSTRAINT: r.CONSTRAINT_NAME.trim(), 
            COLUMN: r.FIELD_NAME.trim() 
        }));
        console.table(columnMap);

        console.log("\n--- Checking for remaining records with ID 42 in these columns ---");
        for (const m of columnMap) {
            const countRes = await db.query(`SELECT COUNT(*) as CNT FROM ${m.TABLE} WHERE ${m.COLUMN} = 42`);
            if (countRes[0].CNT > 0) {
                console.log(`Table ${m.TABLE} column ${m.COLUMN} still has ${countRes[0].CNT} records for Client 42.`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit(0);
    }
}

checkAllRefColumns();
