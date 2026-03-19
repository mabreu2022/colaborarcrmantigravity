const db = require('./src/server/db');

async function testApi() {
    try {
        const query = `
            SELECT 
                C.*,
                COALESCE(C.NUMERO_SERIE, ATV.NUMERO_SERIE) AS NUMERO_SERIE,
                CL.NOME_RAZAO as CLIENTE_NOME,
                SLA.SLDESC as SLA_DESC,
                S.NOME as STATUS_NOME, S.COR as STATUS_COR, S.ENCERRA as STATUS_ENCERRA,
                CO.NOME_CONTATO as CONTATO_NOME,
                ATV.DESCRICAO as ATIVO_NOME,
                T.NOME as TECNICO_NOME,
                CON.DESCRICAO as CONTRATO_DESC
            FROM CHAMADOS C
            LEFT JOIN CLIENTES CL ON C.CODCLIENTE = CL.ID_CLIENTE
            LEFT JOIN CONTRATOS CON ON C.ID_CONTRATO = CON.ID_CONTRATO
            LEFT JOIN SLA ON COALESCE(C.SLAID, CON.SLAID) = SLA.ID_SLA
            LEFT JOIN STATUS_CHAMADO S ON C.ID_STATUS_CHAMADO = S.ID_STATUS_CHAMADO
            LEFT JOIN CONTATOS CO ON C.ID_CONTATO = CO.ID_CONTATO
            LEFT JOIN ATIVOS ATV ON C.ID_ATIVO = ATV.ID_ATIVO
            LEFT JOIN TECNICOS T ON C.ID_TECNICO = T.ID_TECNICO
            ORDER BY C.DATA_HORA DESC
        `;
        const result = await db.query(query);

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

        const parsedResult = await Promise.all(result.map(async row => ({
            ...row,
            DESCRICAO: await processBlob(row.DESCRICAO),
            RESOLUCAO: await processBlob(row.RESOLUCAO),
            CONTRATO_DESC: await processBlob(row.CONTRATO_DESC)
        })));

        const ticket = parsedResult.find(t => t.TICKETID === 'CH-000004');
        if (ticket) {
            console.log('Ticket CH-000004 found in API result.');
            console.log('Description:', ticket.DESCRICAO);
            console.log('Description Length:', ticket.DESCRICAO ? ticket.DESCRICAO.length : 'N/A');
        } else {
            console.log('Ticket CH-000004 NOT found in API result.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

testApi();
