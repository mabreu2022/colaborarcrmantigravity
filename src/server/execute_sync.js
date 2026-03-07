const db = require('./db');

async function executeSync() {
    try {
        console.log("=== INICIANDO SINCRONIZAÇÃO DE ATIVOS X ESTOQUE ===");

        // 1. Pegar ativos sem ID_PRODUTO
        const ativosSemLink = await db.query('SELECT DISTINCT DESCRICAO FROM ATIVOS WHERE ID_PRODUTO IS NULL');
        console.log(`Identificados ${ativosSemLink.length} grupos de ativos para processar.`);

        for (const item of ativosSemLink) {
            const nome = item.DESCRICAO;
            console.log(`\nProcessando: "${nome}"`);

            // 2. Verificar se produto já existe (case insensitive ou exato)
            let produto = (await db.query('SELECT ID_PRODUTO FROM PRODUTOS WHERE NOME = ?', [nome]))[0];

            let idProduto;
            if (!produto) {
                console.log(`- Criando novo produto: "${nome}"`);
                const insertResult = await db.query(
                    "INSERT INTO PRODUTOS (NOME, DESCRICAO, UNIDADE, ATIVO, SALDO_ATUAL, PRECO_VENDA) VALUES (?, ?, 'UN', 'S', 0, 0) RETURNING ID_PRODUTO",
                    [nome, `Gerado via Sincronização Legada`]
                );
                idProduto = insertResult.ID_PRODUTO;
            } else {
                idProduto = produto.ID_PRODUTO;
                console.log(`- Produto já existe (ID: ${idProduto}).`);
            }

            // 3. Vincular ativos
            console.log(`- Vinculando ativos ao ID_PRODUTO: ${idProduto}`);
            await db.query('UPDATE ATIVOS SET ID_PRODUTO = ? WHERE DESCRICAO = ? AND ID_PRODUTO IS NULL', [idProduto, nome]);

            // 4. Atualizar Saldo (Count de Ativos em Estoque - Status 2)
            const countRes = (await db.query('SELECT COUNT(*) as QTD FROM ATIVOS WHERE ID_PRODUTO = ? AND ID_STATUS = 2', [idProduto]))[0];
            const qtdEstoque = countRes.QTD || 0;

            console.log(`- Atualizando saldo para: ${qtdEstoque}`);
            await db.query('UPDATE PRODUTOS SET SALDO_ATUAL = ? WHERE ID_PRODUTO = ?', [qtdEstoque, idProduto]);
        }

        console.log("\n=== SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO! ===");

    } catch (e) {
        console.error("ERRO CRÍTICO NA SINCRONIZAÇÃO:", e);
    } finally {
        process.exit();
    }
}

executeSync();
