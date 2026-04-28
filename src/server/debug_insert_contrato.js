const db = require('./db');
require('dotenv').config();

async function testInsert() {
    try {
        console.log('Testing INSERT into CONTRATOS...');

        const query = `
            INSERT INTO CONTRATOS (ID_CLIENTE, DATA_INICIO, DATA_FIM, VALOR_MENSAL, ID_STATUS, SLAID, DESCRICAO, OBSERVACOES)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING ID_CONTRATO
        `;

        const params = [43, '2026-04-28', '2027-04-28', 2500, 1, null, 'contrato01', 'teste'];
        console.log('Params:', params);

        const result = await db.query(query, params);
        console.log('SUCCESS! Insert Result:', result);
        process.exit(0);
    } catch (error) {
        console.error('INSERT ERROR:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        process.exit(1);
    }
}

testInsert();
