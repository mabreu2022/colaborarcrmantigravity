const db = require('./src/server/db');
db.query("SELECT * FROM CHAMADOS WHERE TICKETID LIKE '%000005%'")
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(e => console.error(e));
