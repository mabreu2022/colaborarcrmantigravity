const db = require('./db');
require('dotenv').config();

async function fixData() {
    try {
        console.log("--- Inserting Inativo Status ---");
        // Check if exists first
        db.query(`SELECT * FROM STATUS_CONTRATO WHERE NOME = 'Inativo'`, (err, res) => {
            if (err) { console.error(err); db.detach(); return; }

            if (res.length === 0) {
                db.query("INSERT INTO STATUS_CONTRATO (NOME, DESCRICAO, ATIVO) VALUES ('Inativo', 'Inativo', 1)", (e, r) => {
                    if (e) console.error("Error inserting:", e);
                    else console.log("Inserted 'Inativo'.");
                    db.detach();
                });
            } else {
                console.log("'Inativo' already exists.");
                db.detach();
            }
        });

    } catch (e) {
        console.error(e);
        if (db) db.detach();
    }
}

fixData();
