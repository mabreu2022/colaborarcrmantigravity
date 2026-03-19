async function verify() {
    const API_URL = 'http://localhost:3000/api';
    try {
        console.log('--- VERIFYING CHAMADOS CLIENT FILTER ---');
        // We know client 1 exists from previous research
        const ticketsRes = await fetch(`${API_URL}/chamados?cliente=1`);
        const tickets = await ticketsRes.json();
        console.log(`Tickets for client 1: ${tickets.length}`);
        if (tickets.length > 0) {
            console.log(`First ticket TICKETID: ${tickets[0].TICKETID}`);
        }

        console.log('\n--- VERIFYING AGENDAMENTOS ID_CHAMADO ---');
        const agendasRes = await fetch(`${API_URL}/agendamentos`);
        const agendas = await agendasRes.json();
        console.log(`Agendas found: ${agendas.length}`);
        if (agendas.length > 0) {
            const fields = Object.keys(agendas[0]);
            console.log('Fields in first agenda:', fields.join(', '));
            console.log(`ID_CHAMADO: ${agendas[0].ID_CHAMADO}`);
            console.log(`CH_TICKETID: ${agendas[0].CH_TICKETID}`);
        }

    } catch (err) {
        console.error('Verification failed:', err.message);
    }
}

verify();
