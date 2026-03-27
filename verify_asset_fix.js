const db = require('./src/server/db');
const http = require('http');

async function verify() {
    try {
        console.log('--- VERIFICAÇÃO DE EXCLUSÃO LÓGICA DE ATIVOS ---');

        // 1. Verificar se o status Inativo (5) existe
        const status = await db.query('SELECT * FROM "STATUS" WHERE ID_STATUS = 5');
        if (status.length === 0) {
            console.error('❌ Status Inativo (5) não encontrado no banco.');
            return;
        }
        console.log('✅ Status Inativo (5) confirmado.');

        // 2. Buscar um ativo para teste
        const assets = await db.query('SELECT FIRST 1 ID_ATIVO, DESCRICAO FROM ATIVOS WHERE ID_STATUS <> 5');
        if (assets.length === 0) {
            console.warn('⚠️ Nenhum ativo disponível para teste.');
            return;
        }
        const assetId = assets[0].ID_ATIVO;
        console.log(`✅ Ativo para teste: "${assets[0].DESCRICAO}" (ID ${assetId})`);

        // 3. Simular requisição DELETE via HTTP para o backend
        // Assumindo que o backend está rodando na porta 3011
        console.log(`Enviando DELETE para /api/ativos/${assetId}...`);
        
        const options = {
            hostname: 'localhost',
            port: 3006,
            path: `/api/ativos/${assetId}`,
            method: 'DELETE'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', async () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success) {
                        console.log('✅ Resposta do API: Sucesso.');

                        // 4. Verificar no banco se o status mudou para 5
                        const updated = await db.query('SELECT ID_STATUS FROM ATIVOS WHERE ID_ATIVO = ?', [assetId]);
                        if (updated[0].ID_STATUS === 5) {
                            console.log('✅ Banco de dados atualizado: ID_STATUS = 5.');
                            console.log('--- SUCESSO ---');
                        } else {
                            console.error(`❌ Falha: ID_STATUS esperado 5, encontrado ${updated[0].ID_STATUS}.`);
                        }
                    } else {
                        console.error('❌ Erro retornado pela API:', result.error);
                    }
                } catch (e) {
                    console.error('❌ Erro ao processar resposta da API:', e.message);
                    console.log('Resposta bruta:', data);
                }
                process.exit();
            });
        });

        req.on('error', (e) => {
            console.error(`❌ Erro na requisição HTTP: ${e.message}`);
            process.exit(1);
        });
        req.end();

    } catch (e) {
        console.error('❌ Erro inesperado durante a verificação:', e);
        process.exit(1);
    }
}

verify();
