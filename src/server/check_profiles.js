
const Firebird = require('node-firebird');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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

console.log('Connection options:', { ...options, password: '***' });

Firebird.attach(options, function (err, db) {
    if (err) {
        console.error('Error attaching to database:', err);
        return;
    }

    db.query('SELECT * FROM PERFIS', function (err, result) {
        if (err) {
            console.error('Error querying PERFIS:', err);
            db.detach();
            return;
        }
        console.log('PERFIS:', result);

        db.query('SELECT ID_USUARIO, NOME, ID_PERFIL FROM USUARIOS', function (err, users) {
            if (err) throw err;
            console.log('USUARIOS:', users);
            db.detach();
        });
    });
});
