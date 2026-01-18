
const Firebird = require('node-firebird');
require('dotenv').config({ path: './.env' });

const options = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_PATH,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    lowercase_keys: false,
    role: null,
    pageSize: 4096
};

// Debug options
console.log('Connecting with options:', { ...options, password: '***' });

Firebird.attach(options, function (err, db) {
    if (err) {
        console.error('Connection error:', err);
        return;
    }
    console.log('Connected!');

    // Run sequentially
    const q1 = `CREATE TABLE AGENDA_TECNICOS (
            ID_AGENDA_TECNICO INTEGER NOT NULL PRIMARY KEY,
            ID_AGENDA INTEGER NOT NULL,
            ID_TECNICO INTEGER NOT NULL
        )`;

    db.query(q1, function (err, result) {
        if (err) console.log('Table might exist:', err.message);
        else console.log('Table created.');

        const q2 = `CREATE GENERATOR GEN_AGENDA_TECNICOS_ID`;
        db.query(q2, function (err, res) {
            if (err) console.log('Gen exists?', err.message);
            else console.log('Gen created.');

            const q3 = `SET GENERATOR GEN_AGENDA_TECNICOS_ID TO 0`;
            db.query(q3, function (err, res) {
                if (err) console.log('Set gen failed:', err.message);
                else console.log('Gen set to 0.');

                const qTrig = `CREATE TRIGGER AGENDA_TECNICOS_BI FOR AGENDA_TECNICOS
                    ACTIVE BEFORE INSERT POSITION 0
                    AS
                    BEGIN
                      IF (NEW.ID_AGENDA_TECNICO IS NULL) THEN
                        NEW.ID_AGENDA_TECNICO = GEN_ID(GEN_AGENDA_TECNICOS_ID,1);
                    END`;

                db.query(qTrig, function (err, res) {
                    if (err) console.log('Trigger exists?', err.message);
                    else console.log('Trigger created.');

                    db.detach();
                });
            });
        });
    });
});
