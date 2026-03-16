const db = require('./db');

async function debugPut() {
    const id = 8; // From user screenshot
    const payload = {
        ID_CLIENTE: 6, // Conect Solutions as seen in screenshot (likely ID)
        DATA_INICIO: '2026-01-29',
        DATA_FIM: '2028-01-29',
        VALOR_MENSAL: '2000',
        ID_STATUS: 1, // Ativo
        SLAID: 1, // 2 horas/4hs
        DESCRICAO: 'Contrato 1',
        OBSERVACOES: 'sem observações'
    };

    try {
        console.log('Simulating PUT /api/contratos/' + id);
        const query = `
            UPDATE CONTRATOS 
            SET ID_CLIENTE = ?, DATA_INICIO = ?, DATA_FIM = ?, VALOR_MENSAL = ?, ID_STATUS = ?, SLAID = ?, DESCRICAO = ?, OBSERVACOES = ?
            WHERE ID_CONTRATO = ?
        `;
        await db.query(query, [
            payload.ID_CLIENTE, payload.DATA_INICIO, payload.DATA_FIM, 
            payload.VALOR_MENSAL, payload.ID_STATUS, payload.SLAID, 
            payload.DESCRICAO, payload.OBSERVACOES, id
        ]);
        console.log('Update successful!');
    } catch (e) {
        console.error('Update Failed!');
        console.error('Error Message:', e.message);
        console.error('Error Details:', e);
    } finally {
        process.exit(0);
    }
}

debugPut();
