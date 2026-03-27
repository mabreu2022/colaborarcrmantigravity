const db = require('./src/server/db');
db.query("SELECT TRIM(RDB$FIELD_NAME) AS FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME = 'ATIVOS'").then(r => {
    console.log(r.map(f => f.FIELD_NAME));
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
