const db = require('./db');
require('dotenv').config();

async function checkSchema() {
    try {
        console.log("--- Checking Agenda Related Tables ---");

        // List of potential tables to check
        const tables = ['AGENDAMENTO', 'AGENDA', 'CONTATOS', 'ITENS_CONTRATO'];

        for (const table of tables) {
            const res = await db.query(`
                SELECT RDB$FIELD_NAME 
                FROM RDB$RELATION_FIELDS 
                WHERE RDB$RELATION_NAME = '${table}'
            `);
            if (res.length > 0) {
                console.log(`Table ${table} exists. Columns:`, res.map(r => r.RDB$FIELD_NAME.trim()));
            } else {
                console.log(`Table ${table} DOES NOT EXIST.`);
            }
        }

        console.log("--- Checking Foreign Keys for ATIVOS ---");
        // Check if ATIVOS has ID_CONTRATO
        const resAtivos = await db.query(`
            SELECT RDB$FIELD_NAME 
            FROM RDB$RELATION_FIELDS 
            WHERE RDB$RELATION_NAME = 'ATIVOS' AND RDB$FIELD_NAME = 'ID_CONTRATO'
        `);
        console.log("ATIVOS has ID_CONTRATO?", resAtivos.length > 0);

        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkSchema();
