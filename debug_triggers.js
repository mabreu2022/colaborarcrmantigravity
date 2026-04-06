const db = require('./src/server/db');

async function checkTriggers() {
    try {
        console.log("--- Checking Triggers for CONTRATOS ---");
        const query = `
            SELECT RDB$TRIGGER_NAME AS TRIGGER_NAME, RDB$TRIGGER_SOURCE AS TRIGGER_SOURCE
            FROM RDB$TRIGGERS
            WHERE RDB$RELATION_NAME = 'CONTRATOS'
        `;
        const result = await db.query(query);
        console.log("Triggers:", result);

        console.log("\n--- Checking Generators ---");
        const genQuery = `
            SELECT RDB$GENERATOR_NAME AS GENERATOR_NAME
            FROM RDB$GENERATORS
            WHERE RDB$SYSTEM_FLAG = 0
        `;
        const generators = await db.query(genQuery);
        console.log("Generators:", generators.map(g => g.RDB$GENERATOR_NAME.trim()));

    } catch (error) {
        console.error("Error checking triggers:", error);
    } finally {
        process.exit(0);
    }
}

checkTriggers();
