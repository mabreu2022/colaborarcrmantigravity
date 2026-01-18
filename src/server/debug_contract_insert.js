const db = require('./db');
require('dotenv').config();

async function debugInsert() {
    try {
        console.log("--- Debugging Contract Insert ---");

        // Mock data similar to user screenshot
        const data = {
            ID_CLIENTE: 1, // assuming client 1 exists
            DATA_INICIO: '2025-12-30',
            DATA_FIM: '2026-12-30',
            VALOR_MENSAL: 1000.00,
            ID_STATUS: 1, // Ativo
            DESCRICAO: 'Debug Insert Test',
            OBSERVACOES: 'Debug observation content'
        };

        const query = `
            INSERT INTO CONTRATOS (ID_CLIENTE, DATA_INICIO, DATA_FIM, VALOR_MENSAL, ID_STATUS, DESCRICAO, OBSERVACOES)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING ID_CONTRATO
        `;

        console.log("Executing Query with values:", Object.values(data));

        const result = await db.query(query, Object.values(data));
        console.log("Insert Success! ID:", result.ID_CONTRATO);
        process.exit(0);

    } catch (e) {
        console.error("Insert Failed:", e);
        process.exit(1);
    }
}

debugInsert();
