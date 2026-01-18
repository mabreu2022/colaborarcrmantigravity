
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

Firebird.attach(options, function (err, db) {
    if (err) {
        console.error('Connection error:', err);
        return;
    }
    console.log('Connected to Database');

    const tables = [
        `CREATE TABLE ESPECIALIDADES (
            ID_ESPECIALIDADE INTEGER NOT NULL PRIMARY KEY,
            NOME VARCHAR(100)
        )`,
        `CREATE TABLE TECNICOS (
            ID_TECNICO INTEGER NOT NULL PRIMARY KEY,
            NOME VARCHAR(100),
            CPF VARCHAR(20),
            EMAIL VARCHAR(100),
            TELEFONE VARCHAR(20)
        )`,
        `CREATE TABLE TECNICO_ESPECIALIDADES (
            ID_TECNICO_ESPECIALIDADE INTEGER NOT NULL PRIMARY KEY,
            ID_TECNICO INTEGER,
            ID_ESPECIALIDADE INTEGER
        )`,
        `CREATE TABLE AGENDA_TECNICOS (
            ID_AGENDA_TECNICO INTEGER NOT NULL PRIMARY KEY,
            ID_AGENDA INTEGER,
            ID_TECNICO INTEGER
        )`
    ];

    const generators = [
        'GEN_ESPECIALIDADES_ID',
        'GEN_TECNICOS_ID',
        'GEN_TECNICO_ESPECIALIDADES_ID',
        'GEN_AGENDA_TECNICOS_ID'
    ];

    // Simple helper to run queries sequentially
    const runQueries = (queries, callback) => {
        if (queries.length === 0) return callback();
        const q = queries.shift();
        db.query(q, (err) => {
            if (err) console.log('Query ignored/failed (likely exists):', err.message);
            else console.log('Query success:', q.substring(0, 50));
            runQueries(queries, callback);
        });
    };

    // 1. Create Tables
    runQueries([...tables], () => {
        // 2. Create Generators
        const genQueries = generators.map(g => `CREATE GENERATOR ${g}`);
        runQueries(genQueries, () => {
            // 3. Set Generators
            const setGenQueries = generators.map(g => `SET GENERATOR ${g} TO 0`);
            runQueries(setGenQueries, () => {
                // 4. Create Triggers
                const triggers = [
                    `CREATE TRIGGER ESPECIALIDADES_BI FOR ESPECIALIDADES ACTIVE BEFORE INSERT POSITION 0 AS BEGIN IF (NEW.ID_ESPECIALIDADE IS NULL) THEN NEW.ID_ESPECIALIDADE = GEN_ID(GEN_ESPECIALIDADES_ID,1); END`,
                    `CREATE TRIGGER TECNICOS_BI FOR TECNICOS ACTIVE BEFORE INSERT POSITION 0 AS BEGIN IF (NEW.ID_TECNICO IS NULL) THEN NEW.ID_TECNICO = GEN_ID(GEN_TECNICOS_ID,1); END`,
                    `CREATE TRIGGER TECNICO_ESPECIALIDADES_BI FOR TECNICO_ESPECIALIDADES ACTIVE BEFORE INSERT POSITION 0 AS BEGIN IF (NEW.ID_TECNICO_ESPECIALIDADE IS NULL) THEN NEW.ID_TECNICO_ESPECIALIDADE = GEN_ID(GEN_TECNICO_ESPECIALIDADES_ID,1); END`,
                    `CREATE TRIGGER AGENDA_TECNICOS_BI FOR AGENDA_TECNICOS ACTIVE BEFORE INSERT POSITION 0 AS BEGIN IF (NEW.ID_AGENDA_TECNICO IS NULL) THEN NEW.ID_AGENDA_TECNICO = GEN_ID(GEN_AGENDA_TECNICOS_ID,1); END`
                ];
                runQueries(triggers, () => {
                    console.log('Finished setup.');
                    db.detach();
                });
            });
        });
    });
});
