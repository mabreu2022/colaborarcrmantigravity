const db = require('./db');

async function simulate() {
    try {
        console.log("--- SIMULAÇÃO DE IMPORTAÇÃO DE ATIVOS PARA ESTOQUE ---");

        // 1. Pegar todos os ativos sem ID_PRODUTO
        const ativosSemLink = await db.query('SELECT DESCRICAO, COUNT(*) as QTD FROM ATIVOS WHERE ID_PRODUTO IS NULL GROUP BY DESCRICAO');

        console.log(`Encontrados ${ativosSemLink.length} tipos de ativos sem vínculo.`);

        const proposedProducts = ativosSemLink.map(a => ({
            NOME: a.DESCRICAO,
            DESCRICAO: `Gerado automaticamente de Ativos: ${a.DESCRICAO}`,
            ESTOQUE_INICIAL: 0, // Será calculado depois
            VINCULOS_PENDENTES: a.QTD
        }));

        console.table(proposedProducts);

        // 2. Calcular saldos potenciais
        const saldos = await db.query('SELECT DESCRICAO, COUNT(*) as QTD FROM ATIVOS WHERE ID_PRODUTO IS NULL AND ID_STATUS = 2 GROUP BY DESCRICAO');
        console.log("\n--- SALDOS INICIAIS ESTIMADOS (Baseado em Status 'Estoque') ---");
        console.table(saldos);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

simulate();
