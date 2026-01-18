const db = require('./db');
require('dotenv').config();

async function debug() {
    try {
        console.log("--- Checking Data in STATUS_CONTRATO ---");
        db.query(`SELECT * FROM STATUS_CONTRATO`, (err, res) => {
            if (err) console.error("Error:", err);
            else {
                console.log("Count:", res.length);
                console.log("Rows:", res);
            }
            db.detach();
        });

    } catch (e) {
        console.error(e);
    }
}

debug();
