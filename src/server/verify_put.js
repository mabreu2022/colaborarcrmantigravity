// Actually user env has node 24, fetch is native?
// Let's assume native fetch or use http.

// Native fetch in Node 18+
const run = async () => {
    try {
        const id = 5; // Use the known ID testing
        const payload = {
            ID_CLIENTE: 1,
            ID_CONTATO: 1,
            ID_CONTRATO: 1,
            ID_ATIVO: 5,
            DATA_RETIRADA: '2026-01-02',
            HORARIO_INICIO: '12:12',
            HORARIO_FIM: '13:13',
            DATA_DEVOLUCAO_PREVISTA: '2026-01-05',
            DATA_DEVOLUCAO: '',
            OBSERVACAO: 'Teste Script PUT',
            ID_STATUS: 1,
            QUANTIDADE: 1,
            tecnicos: []
        };

        console.log('Sending PUT to localhost:3000...');
        const res = await fetch(`http://localhost:3000/api/agendamentos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log('Response:', data);

    } catch (e) {
        console.error('Error:', e);
    }
};

run();
