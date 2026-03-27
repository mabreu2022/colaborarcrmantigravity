const db = require('./src/server/db');
db.query("SELECT MAX(ID_STATUS) as MAX_ID FROM \"STATUS\"").then(r => {
    console.log(r);
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
