const db = require('./src/server/db');

async function diagnose() {
    try {
        console.log('--- Diagnóstico de SLA ---');
        
        const tables = ['SLA', 'CHAMADOS', 'CONTRATOS'];
        
        for (const table of tables) {
            console.log(`\nEstrutura da tabela: ${table}`);
            const queryMeta = `
                SELECT 
                    R.RDB$FIELD_NAME AS FIELD_NAME,
                    F.RDB$FIELD_TYPE AS FIELD_TYPE
                FROM RDB$RELATION_FIELDS R
                JOIN RDB$FIELDS F ON R.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
                WHERE R.RDB$RELATION_NAME = ?
                ORDER BY R.RDB$FIELD_POSITION
            `;
            const columns = await db.query(queryMeta, [table.padEnd(31)]);
            columns.forEach(col => {
                console.log(` - ${col.FIELD_NAME.trim()}`);
            });
        }

        console.log('\n--- Dados de Exemplo ---');
        
        console.log('\nSLA Table:');
        const slas = await db.query('SELECT FIRST 5 * FROM SLA');
        console.log(JSON.stringify(slas, null, 2));

        console.log('\nÚltimos 5 Chamados (SLAID):');
        const chamados = await db.query('SELECT FIRST 5 ID_CHAMADO, TICKETID, SLAID FROM CHAMADOS ORDER BY ID_CHAMADO DESC');
        console.log(JSON.stringify(chamados, null, 2));

        console.log('\nÚltimos 5 Contratos (SLAID):');
        const contratos = await db.query('SELECT FIRST 5 ID_CONTRATO, DESCRICAO, SLAID FROM CONTRATOS ORDER BY ID_CONTRATO DESC');
        console.log(JSON.stringify(contratos, null, 2));

    } catch (err) {
        console.error('Erro no diagnóstico:', err);
    } finally {
        process.exit(0);
    }
}

diagnose();
