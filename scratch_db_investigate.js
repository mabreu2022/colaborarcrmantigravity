const db = require('./src/server/db');

async function run() {
    try {
        console.log('--- STATUS TABLE ---');
        const statuses = await db.query('SELECT * FROM "STATUS"');
        console.log(statuses);

        console.log('\n--- ATIVOS COUNT BY STATUS ---');
        const counts = await db.query('SELECT ID_STATUS, COUNT(*) as CNT FROM ATIVOS GROUP BY ID_STATUS');
        console.log(counts);

        console.log('\n--- FIRST 5 ATIVOS ---');
        const assets = await db.query('SELECT FIRST 5 ID_ATIVO, DESCRICAO, NUMERO_SERIE, ID_CLIENTE_PROPRIETARIO, ID_STATUS FROM ATIVOS');
        console.log(assets);

        console.log('\n--- ATIVOS_CONTRATOS ROWS ---');
        const activeContracts = await db.query('SELECT * FROM ATIVOS_CONTRATOS');
        console.log(activeContracts);

        console.log('\n--- CONTRATOS ROWS ---');
        const contracts = await db.query('SELECT ID_CONTRATO, ID_CLIENTE, DESCRICAO, ID_STATUS FROM CONTRATOS');
        console.log(contracts);

        console.log('\n--- CLIENTES ROWS ---');
        const clients = await db.query('SELECT FIRST 5 ID_CLIENTE, NOME_RAZAO FROM CLIENTES');
        console.log(clients);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
