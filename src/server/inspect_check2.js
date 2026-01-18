const db = require('./db');
require('dotenv').config({ path: 'src/server/.env' });

async function inspectTrigger() {
    try {
        console.log("--- Inspecting Trigger CHECK_2 ---");

        const query = `
            SELECT RDB$TRIGGER_NAME, RDB$TRIGGER_SOURCE 
            FROM RDB$TRIGGERS 
            WHERE RDB$TRIGGER_NAME = 'CHECK_2'
        `;

        const result = await db.query(query);

        if (result.length === 0) {
            console.log("Trigger CHECK_2 not found.");
            process.exit(0);
        }

        const trigger = result[0];
        const sourceBlob = trigger.RDB$TRIGGER_SOURCE;

        if (!sourceBlob) {
            console.log("Source is null");
            process.exit(0);
        }

        // Helper to read blob
        const readBlob = (blob) => {
            return new Promise((resolve, reject) => {
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

        const source = await readBlob(sourceBlob);
        console.log("TRIGGER SOURCE:");
        console.log(source);

        db.detach();

    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

inspectTrigger();
