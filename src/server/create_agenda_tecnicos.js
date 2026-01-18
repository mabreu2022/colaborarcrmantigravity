
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

    const commands = [
        `CREATE TABLE AGENDA_TECNICOS (
            ID_AGENDA_TECNICO INTEGER NOT NULL PRIMARY KEY,
            ID_AGENDA INTEGER NOT NULL,
            ID_TECNICO INTEGER NOT NULL,
            CONSTRAINT FK_AGT_AGENDA FOREIGN KEY (ID_AGENDA) REFERENCES AGENDA (ID_AGENDA) ON DELETE CASCADE,
            CONSTRAINT FK_AGT_USUARIO FOREIGN KEY (ID_TECNICO) REFERENCES USUARIOS (ID_USUARIO)
        )`,
        `CREATE GENERATOR GEN_AGENDA_TECNICOS_ID`,
        `SET GENERATOR GEN_AGENDA_TECNICOS_ID TO 0`,
        `CREATE TRIGGER AGENDA_TECNICOS_BI FOR AGENDA_TECNICOS
        ACTIVE BEFORE INSERT POSITION 0
        AS
        BEGIN
          IF (NEW.ID_AGENDA_TECNICO IS NULL) THEN
            NEW.ID_AGENDA_TECNICO = GEN_ID(GEN_AGENDA_TECNICOS_ID,1);
        END`
    ];

    const runCommand = (index) => {
        if (index >= commands.length) {
            console.log('All commands executed.');
            db.detach();
            return;
        }

        db.query(commands[index], function (err, result) {
            if (err) {
                // Ignore "Table already exists" errors roughly
                if (err.message.includes('exists') || err.message.includes('unsuccessful metadata update')) {
                    console.log(`Command ${index} (exists/skip):`, err.message);
                } else {
                    console.error(`Command ${index} failed:`, err);
                }
            } else {
                console.log(`Command ${index} success.`);
            }
            runCommand(index + 1);
        });
    };

    runCommand(0);
});
