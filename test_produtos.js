const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src/server/.env') });
const db = require('./src/server/db');

async function testQuery() {
    try {
        console.log("Testando query de produtos...");
        const query = `
            SELECT P.*, F.RAZAO_SOCIAL as FORNECEDOR_NOME
            FROM PRODUTOS P
            LEFT JOIN FORNECEDORES F ON P.ID_FORNECEDOR = F.ID_FORNECEDOR
            WHERE P.ATIVO = 'S'
            ORDER BY P.NOME
        `;
        const result = await db.query(query);
        console.log("Resultado:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Erro na query:", error);
    } finally {
        process.exit();
    }
}

testQuery();
