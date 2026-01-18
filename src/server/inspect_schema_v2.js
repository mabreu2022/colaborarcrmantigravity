const db = require('./db');
require('dotenv').config();

async function debug() {
    try {
        console.log("--- Checking TABLES Existence ---");
        db.query(`SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$RELATION_NAME IN ('STATUS_CONTRATO', 'STATUS')`, (err, result) => {
            if (err) console.error("Error checking tables:", err);
            else {
                console.log("Tables found:", result.map(row => row.RDB$RELATION_NAME.trim()));
            }

            console.log("--- Checking CONTRATOS Columns ---");
            db.query(`SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME = 'CONTRATOS'`, (err, res) => {
                if (err) console.error("Error checking columns:", err);
                else {
                    console.log("CONTRATOS Columns:", res.map(row => row.RDB$FIELD_NAME.trim()));
                }
                db.detach();
            });
        });

    } catch (e) {
        console.error(e);
    }
}

debug();
