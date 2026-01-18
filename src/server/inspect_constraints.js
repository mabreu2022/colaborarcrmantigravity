const db = require('./db');
require('dotenv').config();

async function inspectConstraints() {
    try {
        console.log("--- Inspecting Constraints for CLIENTES ---");

        // 1. Relation Constraints
        const constraintQuery = `
            SELECT rc.RDB$CONSTRAINT_NAME, rc.RDB$CONSTRAINT_TYPE, rc.RDB$INDEX_NAME
            FROM RDB$RELATION_CONSTRAINTS rc
            WHERE rc.RDB$RELATION_NAME = 'CLIENTES'
        `;

        const constraints = await db.query(constraintQuery);
        console.log("RELATION CONSTRAINTS:", constraints);

        // 2. Triggers
        const triggerQuery = `
            SELECT RDB$TRIGGER_NAME, RDB$TRIGGER_TYPE, RDB$TRIGGER_SOURCE
            FROM RDB$TRIGGERS
            WHERE RDB$RELATION_NAME = 'CLIENTES'
        `;
        const triggers = await db.query(triggerQuery);

        // Helper to convert BLOB
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
                    resolve(String(blob));
                }
            });
        };

        console.log("TRIGGERS:");
        for (const t of triggers) {
            const source = await processBlob(t.RDB$TRIGGER_SOURCE);
            console.log(`- ${t.RDB$TRIGGER_NAME} (${t.RDB$TRIGGER_TYPE}): ${source.substring(0, 100)}...`);
        }

        // 3. Check Constraints
        const checkQuery = `
            SELECT rc.RDB$CONSTRAINT_NAME, cc.RDB$TRIGGER_NAME, cc.RDB$CHECK_SOURCE
            FROM RDB$RELATION_CONSTRAINTS rc
            JOIN RDB$CHECK_CONSTRAINTS cc ON rc.RDB$CONSTRAINT_NAME = cc.RDB$CONSTRAINT_NAME
            WHERE rc.RDB$RELATION_NAME = 'CLIENTES'
        `;

        const checks = await db.query(checkQuery);
        console.log("CHECK CONSTRAINTS:");
        for (const c of checks) {
            const source = await processBlob(c.RDB$CHECK_SOURCE);
            console.log(`- Constraint: ${c.RDB$CONSTRAINT_NAME}, Trigger: ${c.RDB$TRIGGER_NAME}`);
            console.log(`  Source: ${source}`);
        }

    } catch (e) {
        console.error("Script Error:", e);
    }
}

inspectConstraints();
