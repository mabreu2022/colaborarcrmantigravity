const db = require('./src/server/db');

async function restoreSLA() {
    try {
        console.log('--- Restoring missing SLA records ---');
        
        // SLA 1: 4 Horas
        console.log('Inserting SLA 1...');
        await db.query("INSERT INTO SLA (ID_SLA, SLDESC) VALUES (1, '4 Horas')");
        
        // SLA 3: 24 Horas
        console.log('Inserting SLA 3...');
        await db.query("INSERT INTO SLA (ID_SLA, SLDESC) VALUES (3, '24 Horas')");

        console.log('Restoration complete!');
        
        // Verify
        const result = await db.query("SELECT * FROM SLA ORDER BY ID_SLA");
        console.log('Current SLA records:');
        console.log(JSON.stringify(result, null, 2));

    } catch (err) {
        console.error('Error during restoration:', err.message);
    } finally {
        process.exit(0);
    }
}

restoreSLA();
