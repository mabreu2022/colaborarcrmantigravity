require('dotenv').config();
const Firebird = require('node-firebird');

const options = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    lowercase_keys: false,
    role: null,
    pageSize: 4096
};

console.log("Connecting to:", options.host, options.database);

Firebird.attach(options, function (err, db) {
    if (err) {
        console.error("Connection Error:", err);
        return;
    }

    console.log("Connected. Querying ATIVOS...");

    // 1. Get ATIVOS columns
    db.query('SELECT FIRST 1 * FROM ATIVOS', function (err, result) {
        if (err) console.error("ATIVOS Error:", err);
        else console.log("ATIVOS Columns:", result.length ? Object.keys(result[0]) : "Empty Table");

        // 2. Get STATUS columns
        db.query('SELECT FIRST 1 * FROM "STATUS"', function (err, result) {
            if (err) console.error("STATUS Error:", err);
            else console.log("STATUS Columns:", result.length ? Object.keys(result[0]) : "Empty Table");

            db.detach();
        });
    });
});
