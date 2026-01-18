const db = require('./db');
require('dotenv').config();

async function testJoins() {
    try {
        console.log("Testing Joins individually...");

        const joins = [
            `LEFT JOIN CLIENTES CL ON AG.ID_CLIENTE = CL.ID_CLIENTE`,
            `LEFT JOIN CONTATOS CO ON AG.ID_CONTATO = CO.ID_CONTATO`,
            `LEFT JOIN CONTRATOS CON ON AG.ID_CONTRATO = CON.ID_CONTRATO`,
            `LEFT JOIN ATIVOS AT ON AG.ID_ATIVO = AT.ID_ATIVO`,
            // Test STATUS with quotes
            `LEFT JOIN "STATUS" S ON AG.ID_STATUS = S.ID_STATUS`
        ];

        for (const join of joins) {
            console.log(`Testing Join: ${join}`);
            const query = `SELECT FIRST 1 AG.ID_AGENDA FROM AGENDA AG ${join}`;
            try {
                await db.query(query);
                console.log("  -> SUCCESS");
            } catch (e) {
                console.error("  -> FAILED:", e.message);
            }
        }

        console.log("Testing Columns...");
        const columns = [
            "AG.DATA_RETIRADA", "AG.DATA_DEVOLUCAO_PREVISTA", "AG.DATA_DEVOLUCAO", "AG.OBSERVACAO", "AG.ID_STATUS", "AG.QUANTIDADE"
        ];
        for (const col of columns) {
            const query = `SELECT FIRST 1 ${col} FROM AGENDA AG`;
            try {
                await db.query(query);
            } catch (e) { console.error(`  -> Column ${col} FAILED:`, e.message); }
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
testJoins();
