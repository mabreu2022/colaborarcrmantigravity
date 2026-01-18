
const db = require('./db');

async function createTables() {
    console.log('Starting table creation...');

    const queries = [
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
        )`,
        // Generators
        `CREATE GENERATOR GEN_ESPECIALIDADES_ID`,
        `CREATE GENERATOR GEN_TECNICOS_ID`,
        `CREATE GENERATOR GEN_TECNICO_ESPECIALIDADES_ID`,
        `CREATE GENERATOR GEN_AGENDA_TECNICOS_ID`,
        // Set Generators
        `SET GENERATOR GEN_ESPECIALIDADES_ID TO 0`,
        `SET GENERATOR GEN_TECNICOS_ID TO 0`,
        `SET GENERATOR GEN_TECNICO_ESPECIALIDADES_ID TO 0`,
        `SET GENERATOR GEN_AGENDA_TECNICOS_ID TO 0`,
        // Triggers
        `CREATE TRIGGER ESPECIALIDADES_BI FOR ESPECIALIDADES ACTIVE BEFORE INSERT POSITION 0 AS BEGIN IF (NEW.ID_ESPECIALIDADE IS NULL) THEN NEW.ID_ESPECIALIDADE = GEN_ID(GEN_ESPECIALIDADES_ID,1); END`,
        `CREATE TRIGGER TECNICOS_BI FOR TECNICOS ACTIVE BEFORE INSERT POSITION 0 AS BEGIN IF (NEW.ID_TECNICO IS NULL) THEN NEW.ID_TECNICO = GEN_ID(GEN_TECNICOS_ID,1); END`,
        `CREATE TRIGGER TECNICO_ESPECIALIDADES_BI FOR TECNICO_ESPECIALIDADES ACTIVE BEFORE INSERT POSITION 0 AS BEGIN IF (NEW.ID_TECNICO_ESPECIALIDADE IS NULL) THEN NEW.ID_TECNICO_ESPECIALIDADE = GEN_ID(GEN_TECNICO_ESPECIALIDADES_ID,1); END`,
        `CREATE TRIGGER AGENDA_TECNICOS_BI FOR AGENDA_TECNICOS ACTIVE BEFORE INSERT POSITION 0 AS BEGIN IF (NEW.ID_AGENDA_TECNICO IS NULL) THEN NEW.ID_AGENDA_TECNICO = GEN_ID(GEN_AGENDA_TECNICOS_ID,1); END`
    ];

    for (const query of queries) {
        try {
            await db.query(query);
            console.log('Success:', query.substring(0, 50) + '...');
        } catch (error) {
            // Ignore "exists" errors
            if (error.message && (error.message.includes('exists') || error.message.includes('unsuccessful metadata update'))) {
                console.log('Skipped (exists):', query.substring(0, 50) + '...');
            } else {
                console.error('Error executing query:', query, error);
            }
        }
    }
    console.log('Finished creating tables.');
    process.exit(0);
}

createTables();
