const db = require('./src/server/db');

async function debug() {
    try {
        console.log("Checking ticket CH-000005...");
        const ticket = await db.query("SELECT ID_CHAMADO, TICKETID, ID_ATIVO FROM CHAMADOS WHERE TICKETID LIKE '%000005%'");
        console.log("Ticket Data:", JSON.stringify(ticket, null, 2));

        if (ticket.length > 0 && ticket[0].ID_ATIVO) {
            const asset = await db.query("SELECT * FROM ATIVOS WHERE ID_ATIVO = ?", [ticket[0].ID_ATIVO]);
            console.log("Asset Data:", JSON.stringify(asset, null, 2));
        } else {
            console.log("No asset linked to this ticket (ID_ATIVO is null or no ticket found).");
        }
    } catch (e) {
        console.error(e);
    }
}

debug();
