const db = require('./db');
require('dotenv').config();

// Replicating the helper from index.js
const processBlob = (blob) => {
    return new Promise((resolve, reject) => {
        if (!blob) return resolve('');
        if (Buffer.isBuffer(blob)) return resolve(blob.toString());
        if (typeof blob === 'function') {
            blob((err, name, eventEmitter) => {
                if (err) return reject(err);
                let data = '';
                eventEmitter.on('data', chunk => data += chunk.toString());
                eventEmitter.on('end', () => resolve(data));
                eventEmitter.on('error', reject);
            });
        } else {
            resolve(blob ? blob.toString() : '');
        }
    });
};

async function debugEndpoint() {
    try {
        console.log("--- Executing Endpoint Logic ---");
        const query = `
            SELECT 
                C.ID_CONTRATO,
                C.ID_CLIENTE,
                CL.NOME_RAZAO,
                C.DATA_INICIO,
                C.DATA_FIM,
                C.VALOR_MENSAL,
                C.ID_STATUS,
                S.NOME as STATUS_NOME,
                C.DESCRICAO,
                C.OBSERVACOES
            FROM CONTRATOS C
            LEFT JOIN CLIENTES CL ON C.ID_CLIENTE = CL.ID_CLIENTE
            LEFT JOIN STATUS_CONTRATO S ON C.ID_STATUS = S.ID_STATUS
        `;

        console.log("Running Query...");
        const result = await db.query(query);
        console.log(`Query returned ${result.length} rows.`);

        console.log("Processing Rows...");
        const parsedResult = await Promise.all(result.map(async (row, index) => {
            console.log(`Processing Row ${index}...`);
            try {
                const obs = await processBlob(row.OBSERVACOES);
                const desc = await processBlob(row.DESCRICAO);
                return { ...row, OBSERVACOES: obs, DESCRICAO: desc };
            } catch (err) {
                console.error(`Error processing row ${index}:`, err);
                throw err;
            }
        }));

        console.log("Success!");
        console.log(parsedResult[0]); // Print first row sample
        process.exit(0);

    } catch (e) {
        console.error("Endpoint Failed:", e);
        process.exit(1);
    }
}

debugEndpoint();
