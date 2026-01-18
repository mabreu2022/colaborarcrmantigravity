const db = require('./db');
require('dotenv').config();

async function testInsert() {
    try {
        console.log("Testing Agenda Insert...");

        // Mock Data
        // Needs valid IDs. I'll pick first client, contact, contract if available.
        // Or assume ID 1 exists/fail if not.

        // Let's get a valid client first to be safe
        const client = (await db.query('SELECT FIRST 1 ID_CLIENTE FROM CLIENTES'))[0];
        if (!client) throw new Error("No Clients found to test insert");

        const contact = (await db.query(`SELECT FIRST 1 ID_CONTATO FROM CONTATOS WHERE ID_CLIENTE = ${client.ID_CLIENTE}`))[0];

        // Insert Query
        const query = `
            INSERT INTO AGENDA (ID_CLIENTE, ID_CONTATO, ID_CONTRATO, ID_ATIVO, DATA_RETIRADA, DATA_DEVOLUCAO_PREVISTA, DATA_DEVOLUCAO, OBSERVACAO, ID_STATUS, QUANTIDADE)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING ID_AGENDA
        `;

        const params = [
            client.ID_CLIENTE,
            contact ? contact.ID_CONTATO : null,
            null, // Contract
            null, // Ativo
            '2024-01-01', // Data Retirada
            '2024-01-02', // Prevista
            null, // Devolucao
            'Debug Insert',
            1, // Status (Assuming 1 exists in STATUS table)
            1 // Qtde
        ];

        console.log("Params:", params);

        const result = await db.query(query, params);
        console.log("Insert Success! Result:", result);

        process.exit(0);

    } catch (e) {
        console.error("Insert Failed:", e);
        process.exit(1);
    }
}
testInsert();
