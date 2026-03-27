const db = require('./src/server/db');
async function update() {
    try {
        await db.query('INSERT INTO "STATUS" (ID_STATUS, STATUS) VALUES (5, \'Inativo\')');
        console.log('Status Inativo inserido com sucesso.');
    } catch (e) {
        if (e.message.includes('unique index') || e.message.includes('violation of PRIMARY or UNIQUE KEY')) {
            console.log('Status Inativo já existe.');
        } else {
            console.error(e);
        }
    } finally {
        process.exit();
    }
}
update();
