
const db = require('./db');

async function fixGenerators() {
    console.log('Fixing Generators...');

    const updates = [
        { gen: 'GEN_ESPECIALIDADES_ID', table: 'ESPECIALIDADES', id: 'ID_ESPECIALIDADE' },
        { gen: 'GEN_TECNICOS_ID', table: 'TECNICOS', id: 'ID_TECNICO' },
        { gen: 'GEN_TECNICO_ESPECIALIDADES_ID', table: 'TECNICO_ESPECIALIDADES', id: 'ID_TECNICO_ESPECIALIDADE' },
        { gen: 'GEN_AGENDA_TECNICOS_ID', table: 'AGENDA_TECNICOS', id: 'ID_AGENDA_TECNICO' }
    ];

    for (const item of updates) {
        try {
            // Get Max ID
            const res = await db.query(`SELECT MAX(${item.id}) as MAX_ID FROM ${item.table}`);
            const maxId = res[0].MAX_ID || 0;
            console.log(`${item.table}: Max ID = ${maxId}`);

            // Set Generator
            await db.query(`SET GENERATOR ${item.gen} TO ${maxId}`);
            console.log(`Generator ${item.gen} set to ${maxId}`);

        } catch (e) {
            console.error(`Error fixing ${item.gen}:`, e.message);
        }
    }
    console.log('Done.');
    process.exit(0);
}

fixGenerators();
