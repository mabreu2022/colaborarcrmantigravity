const db = require('./src/server/db');

async function checkReferences() {
    try {
        console.log("--- Checking for references to Client 42 ---");
        // Tables I already tried to update: CONTATOS, CONTRATOS, CHAMADOS, ATIVOS, AGENDA, ENDERECOS_CLIENTE, TELEFONES_CLIENTE
        
        const tables = [
            'CLIENTES',
            'CONTATOS',
            'CONTRATOS',
            'CHAMADOS',
            'ATIVOS',
            'AGENDA',
            'ENDERECOS_CLIENTE',
            'TELEFONES_CLIENTE',
            'HISTORICO_CHAMADOS',
            'PAGAMENTOS',
            'MOVIMENTACOES_ESTOQUE'
        ];

        for (const t of tables) {
            // Determine column name - usually ID_CLIENTE but ATIVOS uses ID_CLIENTE_PROPRIETARIO
            let col = 'ID_CLIENTE';
            if (t === 'ATIVOS') col = 'ID_CLIENTE_PROPRIETARIO';
            
            try {
                const res = await db.query(`SELECT COUNT(*) as CNT FROM ${t} WHERE ${col} = 42`);
                if (res[0].CNT > 0) {
                    console.log(`Table ${t} still has ${res[0].CNT} records for Client 42.`);
                }
            } catch (e) {
                // Table or column might not exist
            }
        }

        console.log("\n--- Checking for uncommitted transactions? ---");
        // In Firebird, if we use a pool, we should be okay, but let's try to run everything in a single block if possible.

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit(0);
    }
}

checkReferences();
