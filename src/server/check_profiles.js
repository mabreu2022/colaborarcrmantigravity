
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
    if (err) throw err;

    db.query('SELECT * FROM PERFIS', function (err, result) {
        if (err) throw err;
        console.log('PERFIS:', result);

        db.query('SELECT ID_USUARIO, NOME, ID_PERFIL FROM USUARIOS', function (err, users) {
            if (err) throw err;
            console.log('USUARIOS:', users);
            db.detach();
        });
    });
});
