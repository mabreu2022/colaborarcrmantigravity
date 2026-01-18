const db = require('./db');
require('dotenv').config();

async function fixSchema() {
    try {
        console.log("--- Checking CONTRATOS Schema ---");

        // 1. Check if column exists
        db.query(`SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME = 'CONTRATOS' AND RDB$FIELD_NAME = 'DESCRICAO'`, (err, res) => {
            if (err) {
                console.error("Error checking metadata:", err);
                db.detach();
                return;
            }

            if (res && res.length > 0) {
                console.log("Column DESCRICAO ALREADY EXISTS.");

                // Let's verify if we can select it
                db.query('SELECT FIRST 1 DESCRICAO FROM CONTRATOS', (e, r) => {
                    if (e) console.log("BUT SELECT FAILED:", e.message);
                    else console.log("SELECT WORKS. Sample:", r);
                    db.detach();
                });

            } else {
                console.log("Column DESCRICAO MISSING. Adding it...");
                db.query('ALTER TABLE CONTRATOS ADD DESCRICAO VARCHAR(200) CHARACTER SET UTF8', (err, res) => {
                    if (err) {
                        console.error("Error adding column:", err.message);
                    } else {
                        console.log("Column DESCRICAO ADDED SUCCESSFULLY.");
                    }
                    db.detach();
                });
            }
        });
    } catch (e) {
        console.error(e);
        if (db) db.detach();
    }
}

fixSchema();
