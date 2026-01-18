const db = require('./db');
require('dotenv').config();

async function debug() {
    try {
        console.log("--- Checking STATUS_CONTRATO Values ---");
        db.query(`SELECT * FROM STATUS_CONTRATO`, (err, res) => {
            if (err) console.error("Error reading STATUS_CONTRATO:", err.message);
            else console.log("STATUS_CONTRATO Table Rows:", res);
            db.detach();
        });

    } catch (e) {
        console.error(e);
    }
}

debug();
