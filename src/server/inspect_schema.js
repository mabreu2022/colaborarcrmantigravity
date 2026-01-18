const db = require('./db');
require('dotenv').config();

async function debug() {
    try {
        console.log("--- Checking TABLES ---");
        // Check if STATUS_CONTRATO exists
        db.query(`SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG=0 AND RDB$RELATION_NAME IN ('CONTRATOS', 'STATUS_CONTRATO', 'STATUS')`, (err, result) => {
            if (err) console.error(err);
            else console.log("Tables found:", result);

            // Check CONTRATOS columns
            console.log("--- Checking CONTRATOS Columns ---");
            db.query(`SELECT * FROM CONTRATOS`, (err, res) => {
                if (err) console.error(err);
                else if (res.length > 0) console.log("CONTRATOS Sample:", Object.keys(res[0]));
                else console.log("CONTRATOS is empty, checking metadata not easy with simple query, assuming columns exist or will fail.");

                db.detach();
            });
        });

    } catch (e) {
        console.error(e);
    }
}

debug();
