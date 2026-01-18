const db = require('./db');
require('dotenv').config();

async function debugBlob() {
    try {
        console.log("--- Checking Contract BLOB ---");
        // Get a contract that likely has observations
        const res = await db.query('SELECT FIRST 1 ID_CONTRATO, OBSERVACOES FROM CONTRATOS WHERE OBSERVACOES IS NOT NULL');

        if (res.length > 0) {
            const row = res[0];
            console.log("Type of OBSERVACOES:", typeof row.OBSERVACOES);
            console.log("Is Buffer?", Buffer.isBuffer(row.OBSERVACOES));
            console.log("Value toString():", row.OBSERVACOES ? row.OBSERVACOES.toString() : 'null');

            if (typeof row.OBSERVACOES === 'function') {
                console.log("It is a function! This confirms the bug.");
            }
        } else {
            console.log("No contracts with observations found. Creating one...");
            // ... (could insert one, but user implies they have one)
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugBlob();
