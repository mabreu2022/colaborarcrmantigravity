
const db = require('./db');

async function verifyData() {
    try {
        console.log('Checking database...');
        const techs = await db.query('SELECT * FROM TECNICOS');
        console.log('Technicians found:', techs.length);
        if (techs.length > 0) {
            console.log('Sample:', JSON.stringify(techs[0], null, 2));
        } else {
            console.log('Table TECNICOS is EMPTY.');
        }

        const specs = await db.query('SELECT * FROM ESPECIALIDADES');
        console.log('Specialties found:', specs.length);

        process.exit(0);
    } catch (e) {
        console.error('Error verifying data:', e.message);
        process.exit(1);
    }
}

verifyData();
