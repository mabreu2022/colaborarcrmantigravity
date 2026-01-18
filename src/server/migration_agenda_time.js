const db = require('./db');

async function run() {
    try {
        console.log('Checking for Time columns in AGENDA...');

        // Check/Add HORARIO_INICIO
        try {
            await db.query('SELECT HORARIO_INICIO FROM AGENDA ROWS 1');
            console.log('Column HORARIO_INICIO already exists.');
        } catch (e) {
            console.log('Adding column HORARIO_INICIO...');
            await db.query('ALTER TABLE AGENDA ADD HORARIO_INICIO TIME');
        }

        // Check/Add HORARIO_FIM
        try {
            await db.query('SELECT HORARIO_FIM FROM AGENDA ROWS 1');
            console.log('Column HORARIO_FIM already exists.');
        } catch (e) {
            console.log('Adding column HORARIO_FIM...');
            await db.query('ALTER TABLE AGENDA ADD HORARIO_FIM TIME');
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

run();
