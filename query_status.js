const db = require('./src/server/db');
async function run() {
    try {
        const result = await db.query('SELECT * FROM "STATUS"');
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
