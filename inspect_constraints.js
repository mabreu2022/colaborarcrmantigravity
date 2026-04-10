const db = require('./src/server/db');

async function checkConstraintColumns() {
    try {
        console.log("--- Inspecting Constraint FK_CHAMADOS_CLIENTE ---");
        const query = `
            SELECT 
                S.RDB$FIELD_NAME as FIELD_NAME
            FROM RDB$INDEX_SEGMENTS S
            JOIN RDB$RELATION_CONSTRAINTS C ON S.RDB$INDEX_NAME = C.RDB$INDEX_NAME
            WHERE C.RDB$CONSTRAINT_NAME = 'FK_CHAMADOS_CLIENTE'
        `;
        const result = await db.query(query);
        console.table(result.map(r => r.FIELD_NAME.trim()));

        console.log("\n--- Checking for other tables referencing CLIENTES ---");
        const allRefsQuery = `
            SELECT 
                RC.RDB$RELATION_NAME as TABLE_NAME,
                RC.RDB$CONSTRAINT_NAME as CONSTRAINT_NAME
            FROM RDB$RELATION_CONSTRAINTS RC
            JOIN RDB$REF_CONSTRAINTS RF ON RC.RDB$CONSTRAINT_NAME = RF.RDB$CONSTRAINT_NAME
            WHERE RF.RDB$CONST_NAME_UQ = (
                SELECT RDB$CONSTRAINT_NAME 
                FROM RDB$RELATION_CONSTRAINTS 
                WHERE RDB$RELATION_NAME = 'CLIENTES' AND RDB$CONSTRAINT_TYPE = 'PRIMARY KEY'
            )
        `;
        const allRefs = await db.query(allRefsQuery);
        console.table(allRefs.map(r => ({ TABLE: r.TABLE_NAME.trim(), CONSTRAINT: r.CONSTRAINT_NAME.trim() })));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit(0);
    }
}

checkConstraintColumns();
