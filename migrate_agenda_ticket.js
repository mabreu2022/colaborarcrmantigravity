const db = require('./src/server/db');

async function migrate() {
    try {
        console.log('--- ADDING ID_CHAMADO TO AGENDA ---');
        await db.query('ALTER TABLE AGENDA ADD ID_CHAMADO INTEGER');
        console.log('Column ID_CHAMADO added successfully.');

    } catch (err) {
        if (err.message && err.message.includes('column ID_CHAMADO already exists')) {
            console.log('Column ID_CHAMADO already exists.');
        } else {
            console.error('Error:', err);
        }
    } finally {
        process.exit(0);
    }
}

migrate();
