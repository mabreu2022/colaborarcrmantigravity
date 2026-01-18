const db = require('./db');
require('dotenv').config();

async function updateSchema() {
    try {
        console.log("--- Updating CONTRATOS Schema ---");
        // Check if column exists first
        db.query(`SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME = 'CONTRATOS' AND RDB$FIELD_NAME = 'DESCRICAO'`, (err, res) => {
            if (err) {
                console.error("Error checking column:", err);
                db.detach();
                return;
            }

            if (res && res.length > 0) {
                console.log("Column DESCRICAO already exists.");
                db.detach();
            } else {
                console.log("Column DESCRICAO missing. Adding it...");
                db.query('ALTER TABLE CONTRATOS ADD DESCRICAO VARCHAR(200) CHARACTER SET UTF8', (err, res) => {
                    if (err) console.error("Error adding column:", err);
                    else console.log("Column DESCRICAO added successfully.");
                    db.detach();
                });
            }
        });
    } catch (e) {
        console.error(e);
    }
}

updateSchema();
