const db = require('./src/server/db');

async function mergeClients() {
    const fromId = 42;
    const toId = 41;

    try {
        console.log(`--- Merging Client ${fromId} into ${toId} ---`);

        // List of tables and their actual client ID column names (found via inspection)
        const migrations = [
            { table: 'CONTATOS', column: 'ID_CLIENTE' },
            { table: 'CONTRATOS', column: 'ID_CLIENTE' },
            { table: 'CHAMADOS', column: 'ID_CLIENTE' }, // Keeping this one just in case both exist
            { table: 'CHAMADOS', column: 'CODCLIENTE' }, // The one used in FK_CHAMADOS_CLIENTE
            { table: 'ATIVOS', column: 'ID_CLIENTE_PROPRIETARIO' },
            { table: 'AGENDA', column: 'ID_CLIENTE' },
            { table: 'ENDERECOS_CLIENTE', column: 'ID_CLIENTE' },
            { table: 'TELEFONES_CLIENTE', column: 'ID_CLIENTE' }
        ];

        for (const m of migrations) {
            try {
                console.log(`Updating ${m.table}.${m.column}...`);
                await db.query(`UPDATE ${m.table} SET ${m.column} = ? WHERE ${m.column} = ?`, [toId, fromId]);
                console.log(`  Done.`);
            } catch (e) {
                console.warn(`  Failed to update ${m.table}.${m.column}: ${e.message}`);
            }
        }

        console.log("Deleting Client 42...");
        await db.query("DELETE FROM CLIENTES WHERE ID_CLIENTE = ?", [fromId]);
        console.log("  Client 42 deleted.");

        console.log("Cleanup: Ensuring contact 30 is active...");
        await db.query("UPDATE CONTATOS SET ATIVO = 'S' WHERE ID_CONTATO = 30");
        
        console.log("Merge completed successfully.");

    } catch (error) {
        console.error("Critical error during merge:", error);
    } finally {
        process.exit(0);
    }
}

mergeClients();
