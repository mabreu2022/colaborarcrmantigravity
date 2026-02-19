const db = require('./db');

async function test() {
    try {
        console.log("Iniciando teste de query de produtos...");
        const query = `
            SELECT P.*, F.RAZAO_SOCIAL as FORNECEDOR_NOME
            FROM PRODUTOS P
            LEFT JOIN FORNECEDORES F ON P.ID_FORNECEDOR = F.ID_FORNECEDOR
            WHERE P.ATIVO = 'S'
            ORDER BY P.NOME
        `;
        const result = await db.query(query);
        console.log("Sucesso! Quantidade de produtos:", result.length);
        if (result.length > 0) {
            console.log("Primeiro produto:", JSON.stringify(result[0], null, 2));
        }
    } catch (e) {
        console.error("Erro no teste:", e);
    } finally {
        process.exit();
    }
}

test();
