const db = require('./db');
require('dotenv').config({ path: 'src/server/.env' });

async function inspectCheck() {
    try {
        console.log("--- Inspecting Check Constraint CHECK_2 ---");

        // First, check RDB$CHECK_CONSTRAINTS
        const query = `
            SELECT RDB$CONSTRAINT_NAME, RDB$TRIGGER_NAME 
            FROM RDB$CHECK_CONSTRAINTS 
            WHERE RDB$CONSTRAINT_NAME = 'INTEG_16' OR RDB$TRIGGER_NAME = 'CHECK_2'
        `;

        const result = await db.query(query);
        console.log("Constraint info:", result);

        if (result.length > 0) {
            // Need the trigger source usually for the logic, or CONSTRAINT_SOURCE in some versions
            // Check RDB$RELATION_CONSTRAINTS to map INTEG_16
            const q2 = `
                SELECT RC.RDB$CONSTRAINT_NAME, RC.RDB$CONSTRAINT_TYPE, CC.RDB$TRIGGER_NAME
                FROM RDB$RELATION_CONSTRAINTS RC
                JOIN RDB$CHECK_CONSTRAINTS CC ON RC.RDB$CONSTRAINT_NAME = CC.RDB$CONSTRAINT_NAME
                WHERE RC.RDB$RELATION_NAME = 'CLIENTES'
           `;
            const result2 = await db.query(q2);
            console.log("All Constraints on CLIENTES:", result2.map(r => `${r.RDB$CONSTRAINT_NAME} (${r.RDB$CONSTRAINT_TYPE}) -> Trig: ${r.RDB$TRIGGER_NAME}`));
        }


        db.detach();

    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

inspectCheck();
