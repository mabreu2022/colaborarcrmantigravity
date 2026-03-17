const Firebird = require('node-firebird');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const options = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3050,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER || 'SYSDBA',
    password: process.env.DB_PASSWORD || 'masterkey',
    lowercase_keys: false,
    role: null,
    pageSize: 4096
};

const pool = Firebird.pool(5, options);

const db = {
    query: (query, params = []) => {
        return new Promise((resolve, reject) => {
            pool.get((err, db) => {
                if (err) return reject(err);

                console.log('DB QUERY:', query, params);
                db.query(query, params, async (err, result) => {
                    if (err) {
                        db.detach();
                        return reject(err);
                    }

                    // Process blobs if they exist in the result
                    try {
                        if (Array.isArray(result)) {
                            for (let row of result) {
                                for (let key in row) {
                                    if (typeof row[key] === 'function') {
                                        row[key] = await new Promise((res, rej) => {
                                            row[key]((err, name, eventEmitter) => {
                                                if (err) return rej(err);
                                                let data = '';
                                                eventEmitter.on('data', chunk => data += chunk.toString());
                                                eventEmitter.on('end', () => res(data));
                                                eventEmitter.on('error', rej);
                                            });
                                        });
                                    }
                                }
                            }
                        }
                        db.detach();
                        resolve(result);
                    } catch (blobErr) {
                        db.detach();
                        reject(blobErr);
                    }
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
