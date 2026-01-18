// Native fetch in Node 18+ (bundled)
const run = async () => {
    try {
        const id = 5;
        console.log(`Fetching Agenda ${id}...`);
        const res = await fetch(`http://localhost:3000/api/agendamentos`);
        const data = await res.json();
        const item = data.find(i => i.ID_AGENDA == id);

        console.log('ID:', item.ID_AGENDA);
        console.log('HORARIO_INICIO Raw:', item.HORARIO_INICIO);
        console.log('Type:', typeof item.HORARIO_INICIO);

    } catch (e) {
        console.error('Error:', e);
    }
};

run();
