require('dotenv').config();
const Firebird = require('node-firebird');

const options = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    lowercase_keys: false,
    role: null,
    pageSize: 4096
};

Firebird.attach(options, function (err, db) {
    if (err) {
        console.error('Connection error:', err);
        return;
    }

    const runQuery = (q) => {
        return new Promise((resolve, reject) => {
            db.query(q, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    };

    const checkTable = (tableName) => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT R.RDB$FIELD_NAME AS FIELD_NAME
                FROM RDB$RELATION_FIELDS R
                WHERE R.RDB$RELATION_NAME = '${tableName}'
            `;
            db.query(query, (err, result) => {
                if (err) reject(err);
                else resolve(result.map(r => r.FIELD_NAME.trim()));
            });
        });
    };

    (async () => {
        try {
            console.log('\n--- READING AGENDA (NO UPDATE) ---');
            const last = await runQuery('SELECT FIRST 1 ID_AGENDA FROM AGENDA ORDER BY ID_AGENDA DESC');
            const id = last[0].ID_AGENDA;

            /*
            // mimics app: UPDATE AGENDA SET ... HORARIO_INICIO = ? WHERE ...
            // We only update one field for test
            const timeVal = '14:30'; 
            console.log(`Updating ID ${id} with Time ${timeVal} using params...`);

            await new Promise((resolve, reject) => {
                db.query('UPDATE AGENDA SET HORARIO_INICIO = ? WHERE ID_AGENDA = ?', [timeVal, id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log('Update success.');
            */

            const res = await runQuery(`SELECT ID_AGENDA, HORARIO_INICIO FROM AGENDA WHERE ID_AGENDA = ${id}`);
            console.log('Result:', res[0]);

        } catch (e) {
            console.error('Error:', e);
        } finally {
            db.detach();
        }
    })();
});
