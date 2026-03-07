const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src/server/.env') });
const db = require('./src/server/db');

async function checkData() {
    try {
        console.log("--- ATIVOS CADASTRADOS ---");
        const ativos = await db.query('SELECT ID_ATIVO, DESCRICAO, ID_PRODUTO, ID_STATUS FROM ATIVOS');
        console.table(ativos);

        console.log("\n--- PRODUTOS NO ESTOQUE ---");
        const produtos = await db.query('SELECT ID_PRODUTO, NOME, SALDO_ATUAL FROM PRODUTOS');
        console.table(produtos);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkData();
