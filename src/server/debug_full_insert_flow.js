const db = require('./db');
require('dotenv').config();

async function testFullFlow() {
    try {
        console.log("Creating Test Data...");

        // 1. Create Client
        const clientRes = await db.query(`INSERT INTO CLIENTES (NOME_RAZAO, CPF_CNPJ) VALUES ('Test Client', '11122233344') RETURNING ID_CLIENTE`);
        const clientId = clientRes.ID_CLIENTE;
        console.log("Client:", clientId);

        // 2. Create Contact
        const contactRes = await db.query(`INSERT INTO CONTATOS (ID_CLIENTE, NOME_CONTATO) VALUES (?, 'Test Contact') RETURNING ID_CONTATO`, [clientId]);
        const contactId = contactRes.ID_CONTATO;
        console.log("Contact:", contactId);

        // 3. Create Contract (Status 1=Ativo?)
        // Need to check STATUS_CONTRATO IDs? Assuming 1 is safe or I insert one.
        // Let's just use 1.
        const contractRes = await db.query(`INSERT INTO CONTRATOS (ID_CLIENTE, DATA_INICIO, VALOR_MENSAL, ID_STATUS, DESCRICAO) VALUES (?, '2024-01-01', 100, 1, 'Test Contract') RETURNING ID_CONTRATO`, [clientId]);
        const contractId = contractRes.ID_CONTRATO;
        console.log("Contract:", contractId);

        // 4. Get Existing Asset (Status 2=Estoque?)
        const assetRes = (await db.query(`SELECT FIRST 1 ID_ATIVO FROM ATIVOS`))[0];
        if (!assetRes) throw new Error("No assets found");
        const assetId = assetRes.ID_ATIVO;
        console.log("Asset:", assetId);

        // 5. Insert Agenda
        console.log("Attempting Agenda Insert...");
        const query = `
            INSERT INTO AGENDA (ID_CLIENTE, ID_CONTATO, ID_CONTRATO, ID_ATIVO, DATA_RETIRADA, DATA_DEVOLUCAO_PREVISTA, DATA_DEVOLUCAO, OBSERVACAO, ID_STATUS, QUANTIDADE)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING ID_AGENDA
        `;

        const params = [
            clientId,
            contactId,
            contractId,
            assetId,
            '2024-01-01',
            '2024-01-05',
            null,
            'Full Flow Test',
            2, // Status (Asset status usually?)
            1
        ];

        const agendaRes = await db.query(query, params);
        console.log("Agenda Insert Success! ID:", agendaRes.ID_AGENDA);

        // Clean up? Optional.
        // await db.query('DELETE FROM CLIENTES WHERE ID_CLIENTE = ?', [clientId]); 
        // ... cascades might delete others? Safe to leave for manual cleanup or inspection.

        process.exit(0);

    } catch (e) {
        console.error("Full Flow Failed:", e);
        process.exit(1);
    }
}
testFullFlow();
