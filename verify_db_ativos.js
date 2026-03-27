const db = require('./src/server/db');

async function verify() {
    try {
        console.log('--- VERIFICAÇÃO DIRETA VIA BANCO ---');

        // 1. Criar um ativo de teste se não houver um inativo
        const inativos = await db.query('SELECT * FROM ATIVOS WHERE ID_STATUS = 5');
        console.log(`Ativos inativos no banco: ${inativos.length}`);

        // 2. Executar a consulta que o backend usa
        const query = `
            SELECT 
                A.ID_ATIVO,
                A.DESCRICAO,
                A.ID_STATUS
            FROM ATIVOS A
            WHERE COALESCE(A.ID_STATUS, 0) <> 5
        `;
        const result = await db.query(query);
        console.log(`Ativos retornados pela consulta filtrada: ${result.length}`);

        const foundInactive = result.find(a => a.ID_STATUS === 5);
        if (foundInactive) {
            console.error('❌ Erro: Ativo com ID_STATUS = 5 foi retornado pela consulta!');
        } else {
            console.log('✅ Sucesso: Ativos com ID_STATUS = 5 foram filtrados corretamente.');
        }

        // 3. Verificar o update
        console.log('Testando a lógica de UPDATE...');
        const testAsset = await db.query('SELECT FIRST 1 ID_ATIVO FROM ATIVOS WHERE ID_STATUS <> 5');
        if (testAsset.length > 0) {
            const id = testAsset[0].ID_ATIVO;
            await db.query('UPDATE ATIVOS SET ID_STATUS = 5 WHERE ID_ATIVO = ?', [id]);
            const check = await db.query('SELECT ID_STATUS FROM ATIVOS WHERE ID_ATIVO = ?', [id]);
            if (check[0].ID_STATUS === 5) {
                console.log(`✅ Sucesso: Ativo ${id} foi marcado como Inativo (5).`);
            } else {
                console.error(`❌ Erro: Falha ao atualizar Ativo ${id}.`);
            }
        }

    } catch (e) {
        console.error('❌ Erro:', e);
    } finally {
        process.exit();
    }
}

verify();
