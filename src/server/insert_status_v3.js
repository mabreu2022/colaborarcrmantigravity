const db = require('./db');

async function fixData() {
    try {
        console.log("--- Inserting Inativo Status (Hardcoded) ---");
        const res = await db.query(`SELECT * FROM STATUS_CONTRATO WHERE NOME = 'Inativo'`);
        if (res.length === 0) {
            // Try strict SQL with 'TRUE' or 1
            await db.query("INSERT INTO STATUS_CONTRATO (NOME, DESCRICAO, ATIVO) VALUES ('Inativo', 'Inativo', TRUE)");
            console.log("Inserted 'Inativo' successfully.");
        } else {
            console.log("'Inativo' already exists.");
        }
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        // Fallback to 1 if TRUE fails
        try {
            if (e.message.includes('TRUE')) {
                console.log("Retrying with 1...");
                await db.query("INSERT INTO STATUS_CONTRATO (NOME, DESCRICAO, ATIVO) VALUES ('Inativo', 'Inativo', 1)");
                console.log("Inserted 'Inativo' with 1.");
                process.exit(0);
            }
        } catch (e2) {
            console.error("Fallback failed:", e2);
        }
        process.exit(1);
    }
}

fixData();
