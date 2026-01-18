
const db = require('./db');

async function debugQuery() {
    try {
        console.log('Running API Query...');
        const query = `
            SELECT T.*, 
            (SELECT LIST(E.NOME, ', ') FROM TECNICO_ESPECIALIDADES TE JOIN ESPECIALIDADES E ON TE.ID_ESPECIALIDADE = E.ID_ESPECIALIDADE WHERE TE.ID_TECNICO = T.ID_TECNICO) as ESPECIALIDADES
            FROM TECNICOS T
        `;
        const res = await db.query(query);
        console.log('Result Type:', typeof res);
        console.log('Count:', res.length);
        if (res.length > 0) {
            console.log('First Record keys:', Object.keys(res[0]));
            console.log('ESPECIALIDADES value:', res[0].ESPECIALIDADES);
            console.log('ESPECIALIDADES type:', typeof res[0].ESPECIALIDADES);
            if (Buffer.isBuffer(res[0].ESPECIALIDADES)) {
                console.log('IS BUFFER! String content:', res[0].ESPECIALIDADES.toString());
            }
        }
        process.exit(0);
    } catch (e) {
        console.error('Query Error:', e);
        process.exit(1);
    }
}

debugQuery();
