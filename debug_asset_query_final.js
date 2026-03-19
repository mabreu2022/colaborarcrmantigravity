const db = require('./src/server/db');

async function debug() {
    try {
        const ticketId = 9; 
        console.log(`Testing query for ticketId: ${ticketId}`);
        
        const query = `
            SELECT A.ID_ATIVO, A.DESCRICAO, A.NUMERO_SERIE, S.STATUS
            FROM ATIVOS A
            JOIN CHAMADOS CH ON A.ID_ATIVO = CH.ID_ATIVO
            LEFT JOIN "STATUS" S ON A.ID_STATUS = S.ID_STATUS
            WHERE CH.ID_CHAMADO = ?
        `;
        
        const result = await db.query(query, [ticketId]);
        console.log("Query Result:", JSON.stringify(result, null, 2));

    } catch (e) {
        console.error(e);
    }
}

debug();
