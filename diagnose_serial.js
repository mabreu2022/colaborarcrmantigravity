const nodeFirebird = require('node-firebird');
require('dotenv').config();

const options = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3050,
    database: process.env.DB_PATH,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    lowercase_keys: false
};

nodeFirebird.attach(options, (err, db) => {
    if (err) {
        console.error('Error connecting to DB:', err);
        process.exit(1);
    }

    const query = `
        SELECT 
            CH.ID_CHAMADO, CH.TICKETID, CH.NUMERO_SERIE as CH_SERIAL, 
            A.NUMERO_SERIE as ATIVO_SERIAL, A.DESCRICAO as ATIVO_NOME,
            CH.ID_ATIVO, CH.DESCRICAO
        FROM CHAMADOS CH
        LEFT JOIN ATIVOS A ON CH.ID_ATIVO = A.ID_ATIVO
        WHERE CH.TICKETID IN ('CH-000005', 'CH-000004')
    `;

    db.query(query, (err, result) => {
        if (err) {
            console.error('Query error:', err);
        } else {
            console.log('Query result:', JSON.stringify(result, null, 2));
        }
        db.detach();
    });
});
