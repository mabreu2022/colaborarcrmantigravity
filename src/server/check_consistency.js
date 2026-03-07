const db = require('./db');

async function checkData() {
    try {
        console.log("--- ATIVOS CADASTRADOS ---");
        const ativos = await db.query('SELECT ID_ATIVO, DESCRICAO, ID_PRODUTO, ID_STATUS FROM ATIVOS');
        console.log(JSON.stringify(ativos, null, 2));

        console.log("\n--- PRODUTOS NO ESTOQUE ---");
        const produtos = await db.query('SELECT ID_PRODUTO, NOME, SALDO_ATUAL FROM PRODUTOS');
        console.log(JSON.stringify(produtos, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkData();
