
const Firebird = require('node-firebird');
require('dotenv').config({ path: './.env' });

const options = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_PATH,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    lowercase_keys: false,
    role: null,
    pageSize: 4096
};

Firebird.attach(options, function (err, db) {
    if (err) {
        console.error('Connection error:', err);
        return;
    }

    db.query('SELECT ID_PERFIL, NOME FROM PERFIS', function (err, result) {
        if (err) {
            console.error('Query error:', err);
            db.detach();
            return;
        }
        console.log('PERFIS:', JSON.stringify(result, null, 2));
        db.detach();
    });
});
