const db = require('./db');

async function fixData() {
    try {
        console.log("--- Inserting Inativo Status ---");
        const res = await db.query(`SELECT * FROM STATUS_CONTRATO WHERE NOME = 'Inativo'`);
        if (res.length === 0) {
            console.log("Inserting...");
            await db.query("INSERT INTO STATUS_CONTRATO (NOME, DESCRICAO, ATIVO) VALUES (?, ?, ?)", ['Inativo', 'Inativo', true]);
            console.log("Inserted 'Inativo' successfully.");
        } else {
            console.log("'Inativo' already exists.");
        }
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

fixData();
