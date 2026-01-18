const db = require('./db');
require('dotenv').config();

async function testSafeQuery() {
    try {
        console.log("Testing Safe Query...");
        const query = `
            SELECT 
                AG.ID_AGENDA,
                AG.ID_CLIENTE, C.NOME_RAZAO as CLIENTE_NOME,
                AG.ID_CONTATO, CT.NOME_CONTATO,
                AG.ID_CONTRATO, CN.DESCRICAO as CONTRATO_DESC,
                AG.ID_ATIVO, A.DESCRICAO as ATIVO_DESC, A.NUMERO_SERIE,
                AG.DATA_RETIRADA,
                AG.DATA_DEVOLUCAO_PREVISTA,
                AG.DATA_DEVOLUCAO,
                AG.OBSERVACAO,
                AG.ID_STATUS, S.STATUS as STATUS_NOME,
                AG.QUANTIDADE
            FROM AGENDA AG
            LEFT JOIN CLIENTES C ON AG.ID_CLIENTE = C.ID_CLIENTE
            LEFT JOIN CONTATOS CT ON AG.ID_CONTATO = CT.ID_CONTATO
            LEFT JOIN CONTRATOS CN ON AG.ID_CONTRATO = CN.ID_CONTRATO
            LEFT JOIN ATIVOS A ON AG.ID_ATIVO = A.ID_ATIVO
            LEFT JOIN "STATUS" S ON AG.ID_STATUS = S.ID_STATUS
        `;
        const result = await db.query(query);
        console.log("Query Success!", result.length, "rows found");
        process.exit(0);
    } catch (e) {
        console.error("Query Failed:", e.message);
        process.exit(1);
    }
}
testSafeQuery();
