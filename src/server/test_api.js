const http = require('http');

const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/clientes',
    method: 'GET',
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const clients = JSON.parse(data);
            console.log("--- First 3 Clients ---");
            clients.slice(0, 3).forEach(c => {
                console.log(`ID: ${c.ID_CLIENTE}`);
                console.log(`Nome: '${c.NOME_RAZAO}'`);
                console.log(`Tipo: '${c.TIPO_PESSOA}' (Type: ${typeof c.TIPO_PESSOA})`);
                console.log(`UF: '${c.UF}' (Type: ${typeof c.UF})`);
                console.log("-----------------------");
            });
        } catch (e) {
            console.error("Error parsing JSON:", e);
            console.log("Raw Data:", data.substring(0, 200));
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
