const db = require('./src/server/db');

async function diagnose() {
    try {
        console.log('--- GENERATORS ---');
        const generators = await db.query("SELECT RDB$GENERATOR_NAME FROM RDB$GENERATORS WHERE RDB$SYSTEM_FLAG = 0");
        console.log(JSON.stringify(generators, null, 2));

        if (generators.some(g => g.RDB$GENERATOR_NAME.trim() === 'GEN_SLA_ID')) {
            const genVal = await db.query("SELECT GEN_ID(GEN_SLA_ID, 0) as VAL FROM RDB$DATABASE");
            console.log('GEN_SLA_ID current value:', genVal[0].VAL);
        }

    } catch (err) {
        console.error('Erro no diagnóstico:', err);
    } finally {
        process.exit(0);
    }
}

diagnose();
