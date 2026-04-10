const db = require('./src/server/db');

async function checkCrossLinks() {
    try {
        console.log("--- Checking for Cross-Client Relationships ---");

        // 1. CHAMADOS where ID_CONTRATO belongs to a different client than ID_CLIENTE
        const crossChamados = await db.query(`
            SELECT CH.ID_CHAMADO, CH.ID_CLIENTE as CHAMADO_CLIENT, C.ID_CLIENTE as CONTRATO_CLIENT 
            FROM CHAMADOS CH 
            JOIN CONTRATOS C ON CH.ID_CONTRATO = C.ID_CONTRATO 
            WHERE CH.ID_CLIENTE <> C.ID_CLIENTE
        `);
        console.log(`CHAMADOS with different client than their contract: ${crossChamados.length}`);
        if (crossChamados.length > 0) console.table(crossChamados);

        // 2. ATIVOS_CONTRATOS where the asset owner client different from contract client
        const crossAssets = await db.query(`
            SELECT AC.ID_CONTRATO, AC.ID_ATIVO, C.ID_CLIENTE as CONTRATO_CLIENT, A.ID_CLIENTE_PROPRIETARIO as ASSET_CLIENT
            FROM ATIVOS_CONTRATOS AC
            JOIN CONTRATOS C ON AC.ID_CONTRATO = C.ID_CONTRATO
            JOIN ATIVOS A ON AC.ID_ATIVO = A.ID_ATIVO
            WHERE C.ID_CLIENTE <> A.ID_CLIENTE_PROPRIETARIO
        `);
        console.log(`Asset-Contract links where asset owner client differs from contract client: ${crossAssets.length}`);
        if (crossAssets.length > 0) console.table(crossAssets);

        // 3. Check for any missing sequences or generators (Firebird specific) - just count rows for health
        const tables = ['CLIENTES', 'CONTATOS', 'CONTRATOS', 'ATIVOS', 'CHAMADOS'];
        for (const t of tables) {
            const count = await db.query(`SELECT COUNT(*) as CNT FROM ${t}`);
            const maxId = await db.query(`SELECT MAX(ID_${t.substring(0, t.length-1)}) as MAX_ID FROM ${t}`);
             // Note: this logic is simple, just to see if there are gaps or huge numbers
            console.log(`Table ${t}: ${count[0].CNT} rows, Max ID: ${maxId[0].MAX_ID}`);
        }

    } catch (error) {
        console.error("Error during cross-link check:", error);
    } finally {
        process.exit(0);
    }
}

checkCrossLinks();
