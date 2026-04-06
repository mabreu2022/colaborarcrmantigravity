const db = require('./src/server/db');

async function findIds() {
    try {
        console.log("--- Finding relevant IDs ---");
        const clients = await db.query("SELECT ID_CLIENTE, NOME_RAZAO FROM CLIENTES WHERE NOME_RAZAO LIKE '%EMPRESA DE TESTE%'");
        console.log("Clients:", clients);

        const statuses = await db.query("SELECT ID_STATUS, NOME FROM STATUS_CONTRATO");
        console.log("Statuses:", statuses);

        const slas = await db.query("SELECT ID_SLA, SLDESC FROM SLA");
        console.log("SLAs:", slas);

    } catch (error) {
        console.error("Error finding IDs:", error);
    } finally {
        process.exit(0);
    }
}

findIds();
