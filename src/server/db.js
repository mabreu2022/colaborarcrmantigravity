const Firebird = require('node-firebird');
require('dotenv').config();

const options = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    lowercase_keys: false, // set to true to lowercase keys
    role: null,            // default
    pageSize: 4096        // default when creating database
};

const pool = Firebird.pool(5, options);

const db = {
    query: (query, params = []) => {
        return new Promise((resolve, reject) => {
            pool.get((err, db) => {
                if (err) return reject(err);

                console.log('DB QUERY:', query, params);
                db.query(query, params, (err, result) => {
                    db.detach(); // release connection back to pool
                    if (err) return reject(err);
                    resolve(result);
                });
            });
        });
    },
    testConnection: () => {
        return new Promise((resolve, reject) => {
            pool.get((err, db) => {
                if (err) {
                    console.error('Error connecting to database:', err);
                    return reject(err);
                }
                console.log('Successfully connected to Firebird Database!');
                db.detach();
                resolve();
            });
        });
    }
};

module.exports = db;
