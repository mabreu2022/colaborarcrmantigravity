
const db = require('./db');

async function checkJoin() {
    try {
        console.log('Testing Technician-Specialty Join...');

        // 1. Raw Table Dump
        const te = await db.query('SELECT * FROM TECNICO_ESPECIALIDADES');
        console.log('TECNICO_ESPECIALIDADES Raw:', te);

        // 2. The API Query
        const query = `
            SELECT T.ID_TECNICO, T.NOME, 
            (SELECT LIST(E.NOME, ', ') FROM TECNICO_ESPECIALIDADES TE JOIN ESPECIALIDADES E ON TE.ID_ESPECIALIDADE = E.ID_ESPECIALIDADE WHERE TE.ID_TECNICO = T.ID_TECNICO) as ESPECIALIDADES
            FROM TECNICOS T
        `;
        const res = await db.query(query);

        console.log('\n--- API Query Result ---');
        res.forEach(r => {
            const specs = r.ESPECIALIDADES && Buffer.isBuffer(r.ESPECIALIDADES) ? r.ESPECIALIDADES.toString() : r.ESPECIALIDADES;
            console.log(`Tech: ${r.NOME} (ID: ${r.ID_TECNICO}) -> Skills: ${specs}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkJoin();
