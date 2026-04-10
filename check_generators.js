const db = require('./src/server/db');

async function checkGenerators() {
    try {
        console.log("--- Checking Generators (Auto-increment health) ---");
        const gensRes = await db.query("SELECT RDB$GENERATOR_NAME as NAME FROM RDB$GENERATORS WHERE RDB$SYSTEM_FLAG = 0");
        const generators = gensRes.map(g => g.NAME.trim());

        const results = [];
        for (const gen of generators) {
            const valRes = await db.query(`SELECT GEN_ID(${gen}, 0) as VAL FROM RDB$DATABASE`);
            results.push({ NAME: gen, VALUE: valRes[0].VAL });
        }
        console.table(results);

        console.log("\n--- Checking for suspicious IDs (<= 0) ---");
        const tables = ['CLIENTES', 'CONTATOS', 'CONTRATOS', 'ATIVOS', 'CHAMADOS'];
        for (const t of tables) {
            const idCol = `ID_${t.substring(0, t.length-1)}`;
            const res = await db.query(`SELECT COUNT(*) as CNT FROM ${t} WHERE ${idCol} <= 0`);
            console.log(`${t}: ${res[0].CNT} records with ID <= 0`);
        }

    } catch (error) {
        console.error("Error during generator check:", error);
    } finally {
        process.exit(0);
    }
}

checkGenerators();
