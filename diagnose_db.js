const db = require('./src/server/db');

async function diagnose() {
    try {
        console.log('--- Diagnóstico de Tabelas ---');
        
        const tables = ['CHAMADOS', 'STATUS_CHAMADO', 'CONTATOS'];
        
        for (const table of tables) {
            console.log(`\nEstrutura da tabela: ${table}`);
            try {
                // Query metadata in Firebird
                const query = `
                    SELECT 
                        R.RDB$FIELD_NAME AS FIELD_NAME,
                        F.RDB$FIELD_TYPE AS FIELD_TYPE,
                        F.RDB$FIELD_SUB_TYPE AS SUB_TYPE
                    FROM RDB$RELATION_FIELDS R
                    JOIN RDB$FIELDS F ON R.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
                    WHERE R.RDB$RELATION_NAME = ?
                    ORDER BY R.RDB$FIELD_POSITION
                `;
                const columns = await db.query(query, [table.padEnd(31)]); // Firebird names are padded
                columns.forEach(col => {
                    const name = col.FIELD_NAME.trim();
                    const type = col.FIELD_TYPE;
                    const subType = col.SUB_TYPE;
                    console.log(` - ${name} (Type: ${type}, SubType: ${subType})`);
                });
            } catch (e) {
                console.error(`Erro ao ler tabela ${table}:`, e.message);
            }
        }
        
    } catch (err) {
        console.error('Erro no diagnóstico:', err);
    } finally {
        process.exit(0);
    }
}

diagnose();
