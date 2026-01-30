const Firebird = require('node-firebird');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const configs = [
    {
        name: 'Env Vars',
        options: {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_DATABASE,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            lowercase_keys: false,
            role: null,
            pageSize: 4096
        }
    },
    {
        name: 'Hardcoded 127.0.0.1',
        options: {
            host: '127.0.0.1',
            port: 3050,
            database: 'C:\\Projetos Antigravity\\colaborarcrm\\DataBase\\BANCOCOLABORAR.FDB',
            user: 'SYSDBA',
            password: 'masterkey',
            lowercase_keys: false,
            role: null,
            pageSize: 4096
        }
    },
    {
        name: 'Hardcoded Localhost',
        options: {
            host: 'localhost',
            port: 3050,
            database: 'C:\\Projetos Antigravity\\colaborarcrm\\DataBase\\BANCOCOLABORAR.FDB',
            user: 'SYSDBA',
            password: 'masterkey',
            lowercase_keys: false,
            role: null,
            pageSize: 4096
        }
    },
    {
        name: 'WireCrypt Enabled',
        options: {
            host: '127.0.0.1',
            port: 3050,
            database: 'C:\\Projetos Antigravity\\colaborarcrm\\DataBase\\BANCOCOLABORAR.FDB',
            user: 'SYSDBA',
            password: 'masterkey',
            lowercase_keys: false,
            role: null,
            pageSize: 4096,
            wireCrypt: 'Enabled'
        }
    },
    {
        name: 'WireCrypt Disabled',
        options: {
            host: '127.0.0.1',
            port: 3050,
            database: 'C:\\Projetos Antigravity\\colaborarcrm\\DataBase\\BANCOCOLABORAR.FDB',
            user: 'SYSDBA',
            password: 'masterkey',
            lowercase_keys: false,
            role: null,
            pageSize: 4096,
            wireCrypt: 'Disabled'
        }
    },
    {
        name: 'Legacy Auth True',
        options: {
            host: '127.0.0.1',
            port: 3050,
            database: 'C:\\Projetos Antigravity\\colaborarcrm\\DataBase\\BANCOCOLABORAR.FDB',
            user: 'SYSDBA',
            password: 'masterkey',
            lowercase_keys: false,
            role: null,
            pageSize: 4096,
            retryConnectionInterval: 1000 // Placeholder to separate structure
        }
    },
    {
        name: 'Remote Host provided by User',
        options: {
            host: '179.0.178.186',
            port: 3050,
            database: 'C:\\Projetos antigravity\\colaborarcrm\\databsae\\BANCOCOLABORAR.FDB', // Using user's path verbatim (including typo 'databsae' just in case remote fs is weird)
            user: 'SYSDBA',
            password: 'masterkey',
            lowercase_keys: false,
            role: null,
            pageSize: 4096
        }
    },
    {
        name: 'Remote Host (Corrected Path)',
        options: {
            host: '179.0.178.186',
            port: 3050,
            database: 'C:\\Projetos Antigravity\\colaborarcrm\\DataBase\\BANCOCOLABORAR.FDB', // Corrected path case/typo
            user: 'SYSDBA',
            password: 'masterkey',
            lowercase_keys: false,
            role: null,
            pageSize: 4096
        }
    }
];

async function testConnection(config) {
    console.log(`\n--- Testing: ${config.name} ---`);
    console.log('Options:', { ...config.options, password: '***' });

    return new Promise((resolve) => {
        try {
            Firebird.attach(config.options, function (err, db) {
                if (err) {
                    console.error(`FAILED: ${config.name}`);
                    console.error('Error:', err.message);
                    if (err.gdscode) console.error('GDS Code:', err.gdscode);
                    resolve(false);
                } else {
                    console.log(`SUCCESS: ${config.name}`);
                    console.log('Database attached successfully.');
                    db.detach();
                    resolve(true);
                }
            });
        } catch (e) {
            console.error(`CRASHED: ${config.name}`);
            console.error('Exception:', e);
            resolve(false);
        }
    });
}

async function run() {
    for (const config of configs) {
        await testConnection(config);
    }
}

run();
