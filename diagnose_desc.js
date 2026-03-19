const db = require('./src/server/db');

async function diagnose() {
    try {
        console.log('--- TICKET CH-000004 DATA ---');
        const result = await db.query("SELECT ID_CHAMADO, TICKETID, DESCRICAO FROM CHAMADOS WHERE TICKETID = 'CH-000004'");
        
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
                } else { resolve(blob.toString()); }
            });
        };

        if (result.length > 0) {
            const desc = await processBlob(result[0].DESCRICAO);
            console.log('Description length:', desc.length);
            console.log('Description content:', desc);
        } else {
            console.log('Ticket not found.');
        }

    } catch (err) {
        console.error('Erro no diagnóstico:', err);
    } finally {
        process.exit(0);
    }
}

diagnose();
