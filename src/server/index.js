const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();
const fs = require('fs'); // Added for .env writing

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Swagger Documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});


// Request Logger Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Serve static files from client folder (for testing/production)
const path = require('path');
app.use(express.static(path.join(__dirname, '../client')));

// Multer Setup for Logo Upload
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../client'));
    },
    filename: function (req, file, cb) {
        // Always save as logo.png to keep it simple, or use original extension
        // User asked to choose logo, preserving extension is safer but overwriting logo.png is easier for frontend.
        // Let's try to stick to logo.png for now or detect ext.
        // For simplicity and immediate effect on img tags src="logo.png", we overwrite.
        cb(null, 'logo.png');
    }
});
const upload = multer({ storage: storage });

app.post('/api/config/logo', upload.single('logo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
    }
    // Add cache buster or just return success
    res.json({ success: true, filename: 'logo.png' });
});

// DB Config Endpoints
app.get('/api/config/db', (req, res) => {
    // Return current env vars
    res.json({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || '3050',
        database: process.env.DB_DATABASE || '',
        user: process.env.DB_USER || 'SYSDBA',
        password: process.env.DB_PASSWORD || 'masterkey'
    });
});

app.post('/api/config/db', (req, res) => {
    const { host, port, database, user, password } = req.body;
    const envPath = path.join(__dirname, '.env');

    try {
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Helper to update or append
        const updateVar = (key, val) => {
            const regex = new RegExp(`^${key}=.*`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${val}`);
            } else {
                envContent += `\n${key}=${val}`;
            }
        };

        if (host) updateVar('DB_HOST', host);
        if (port) updateVar('DB_PORT', port);
        if (database) updateVar('DB_DATABASE', database);
        if (user) updateVar('DB_USER', user);
        if (password) updateVar('DB_PASSWORD', password);

        fs.writeFileSync(envPath, envContent.trim() + '\n');

        // Reload dotenv to apply changes immediately to this process
        require('dotenv').config({ override: true });

        res.json({ success: true, message: 'Configuração salva! Reinicie o servidor se necessário.' });
    } catch (error) {
        console.error('Error writing .env:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar configuração: ' + error.message });
    }
});

app.get('/api/config/fs', (req, res) => {
    let dirPath = req.query.path;

    // Safety: If no path, default to C:\
    if (!dirPath) dirPath = 'C:\\';

    try {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        const result = items.map(item => {
            return {
                name: item.name,
                isDirectory: item.isDirectory(),
                path: path.join(dirPath, item.name)
            };
        })
            // Filter: Show all directories, but ONLY .FDB files
            .filter(item => item.isDirectory || item.name.toUpperCase().endsWith('.FDB'))
            .sort((a, b) => {
                // Folders first
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });

        res.json({ current: dirPath, items: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// API Routes
/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health Check
 *     description: Returns the status of the server and database connection.
 *     responses:
 *       200:
 *         description: Server is up and connected to DB.
 *       500:
 *         description: Database connection error.
 */
app.get('/api/health', async (req, res) => {

    try {
        await db.testConnection();
        res.json({ status: 'ok', message: 'Connected to Database' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * @openapi
 * /api/clientes:
 *   get:
 *     summary: List Clients
 *     description: Returns the first 50 clients ordered by name.
 *     responses:
 *       200:
 *         description: A list of clients.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cliente'
 */
app.get('/api/clientes', async (req, res) => {

    try {
        const result = await db.query('SELECT FIRST 50 * FROM CLIENTES ORDER BY NOME_RAZAO');
        // Trim and Uppercase CHAR fields for the frontend
        const trimmedResult = result.map(c => ({
            ...c,
            TIPO_PESSOA: c.TIPO_PESSOA ? c.TIPO_PESSOA.trim().toUpperCase() : null,
            UF: c.UF ? c.UF.trim().toUpperCase() : null
        }));
        res.json(trimmedResult);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/clientes:
 *   post:
 *     summary: Create Client
 *     description: Adds a new client to the database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cliente'
 *     responses:
 *       200:
 *         description: Client created successfully.
 */
app.post('/api/clientes', async (req, res) => {

    let { NOME_RAZAO, NOME_FANTASIA, CPF_CNPJ, IE, EMAIL, TELEFONE, ENDERECO, NUMERO, COMPLEMENTO, BAIRRO, CEP, MUNICIPIO, UF, TIPO_PESSOA, CODIGO_PAIS } = req.body;

    try {
        const query = `
            INSERT INTO CLIENTES (
                NOME_RAZAO, NOME_FANTASIA, CPF_CNPJ, IE, EMAIL, TELEFONE, 
                ENDERECO, NUMERO, COMPLEMENTO, BAIRRO, CEP, MUNICIPIO, UF, 
                TIPO_PESSOA, CODIGO_PAIS, DATA_MODIFICACAO, ATIVO
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'S')
            RETURNING ID_CLIENTE
        `;
        const result = await db.query(query, [
            sanitize(NOME_RAZAO), sanitize(NOME_FANTASIA), cleanDigits(CPF_CNPJ), sanitize(IE), sanitize(EMAIL), cleanDigits(TELEFONE),
            sanitize(ENDERECO), sanitize(NUMERO), sanitize(COMPLEMENTO), sanitize(BAIRRO), cleanDigits(CEP), sanitize(MUNICIPIO), sanitize(UF),
            sanitize(TIPO_PESSOA) || 'F',
            sanitize(CODIGO_PAIS) || 1058 // Default Brazil if missing
        ]);
        res.json({ success: true, id: result.ID_CLIENTE });
    } catch (error) {
        console.error("Error creating client:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/clientes/{id}:
 *   put:
 *     summary: Update Client
 *     description: Updates an existing client's details.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cliente'
 *     responses:
 *       200:
 *         description: Client updated successfully.
 */
app.put('/api/clientes/:id', async (req, res) => {

    const { id } = req.params;
    let { NOME_RAZAO, NOME_FANTASIA, CPF_CNPJ, IE, EMAIL, TELEFONE, ENDERECO, NUMERO, COMPLEMENTO, BAIRRO, CEP, MUNICIPIO, UF, TIPO_PESSOA, CODIGO_PAIS } = req.body;

    console.log(`PUT /api/clientes/${id} Payload:`, req.body); // Debug

    try {
        const query = `
            UPDATE CLIENTES 
            SET NOME_RAZAO=?, NOME_FANTASIA=?, CPF_CNPJ=?, IE=?, EMAIL=?, TELEFONE=?, 
                ENDERECO=?, NUMERO=?, COMPLEMENTO=?, BAIRRO=?, CEP=?, MUNICIPIO=?, UF=?, 
                TIPO_PESSOA=?, CODIGO_PAIS=?, DATA_MODIFICACAO=CURRENT_TIMESTAMP
            WHERE ID_CLIENTE = ?
        `;

        // Sanitize all inputs
        await db.query(query, [
            sanitize(NOME_RAZAO), sanitize(NOME_FANTASIA), cleanDigits(CPF_CNPJ), sanitize(IE), sanitize(EMAIL), cleanDigits(TELEFONE),
            sanitize(ENDERECO), sanitize(NUMERO), sanitize(COMPLEMENTO), sanitize(BAIRRO), cleanDigits(CEP), sanitize(MUNICIPIO), sanitize(UF),
            sanitize(TIPO_PESSOA), sanitize(CODIGO_PAIS) || 1058,
            id
        ]);
        res.json({ success: true });
    } catch (error) {
        console.error(`Error updating client ${id}:`, error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/clientes/{id}:
 *   delete:
 *     summary: Delete Client
 *     description: Removes a client from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Client deleted successfully.
 */
app.delete('/api/clientes/:id', async (req, res) => {

    const { id } = req.params;
    try {
        await db.query('DELETE FROM CLIENTES WHERE ID_CLIENTE = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- CONTATOS ROUTES ---

/**
 * @openapi
 * /api/contatos:
 *   get:
 *     summary: List All Contacts
 *     description: Returns all contacts in the CRM.
 *     responses:
 *       200:
 *         description: A list of contacts.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Contato'
 */
app.get('/api/contatos', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM CONTATOS ORDER BY NOME_CONTATO');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/clientes/:id/contatos', async (req, res) => {

    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM CONTATOS WHERE ID_CLIENTE = ? ORDER BY NOME_CONTATO', [id]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/contatos:
 *   post:
 *     summary: Create Contact
 *     description: Adds a new contact for a client.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contato'
 *     responses:
 *       200:
 *         description: Contact created successfully.
 */
app.post('/api/contatos', async (req, res) => {

    const { ID_CLIENTE, NOME_CONTATO, TELEFONE_CONTATO, EMAIL_CONTATO, CARGO, OBSERVACAO, TIPO_CONTATO } = req.body;
    try {
        const query = `
            INSERT INTO CONTATOS (ID_CLIENTE, NOME_CONTATO, TELEFONE_CONTATO, EMAIL_CONTATO, CARGO, OBSERVACAO, TIPO_CONTATO, ATIVO, DATA_CADASTRO)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'S', CURRENT_DATE)
            RETURNING ID_CONTATO
        `;
        const result = await db.query(query, [ID_CLIENTE, NOME_CONTATO, TELEFONE_CONTATO, EMAIL_CONTATO, CARGO, OBSERVACAO, TIPO_CONTATO]);
        res.json({ success: true, id: result.ID_CONTATO });
    } catch (error) {
        console.error("Error creating contact:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/contatos/{id}:
 *   put:
 *     summary: Update Contact
 *     description: Updates an existing contact's details.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contato'
 *     responses:
 *       200:
 *         description: Contact updated successfully.
 */
app.put('/api/contatos/:id', async (req, res) => {

    const { id } = req.params;
    const { NOME_CONTATO, TELEFONE_CONTATO, EMAIL_CONTATO, CARGO, OBSERVACAO, TIPO_CONTATO } = req.body;
    try {
        const query = `
            UPDATE CONTATOS 
            SET NOME_CONTATO=?, TELEFONE_CONTATO=?, EMAIL_CONTATO=?, CARGO=?, OBSERVACAO=?, TIPO_CONTATO=?
            WHERE ID_CONTATO = ?
        `;
        await db.query(query, [NOME_CONTATO, TELEFONE_CONTATO, EMAIL_CONTATO, CARGO, OBSERVACAO, TIPO_CONTATO, id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/contatos/{id}:
 *   delete:
 *     summary: Delete Contact
 *     description: Removes a contact from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contact deleted successfully.
 */
app.delete('/api/contatos/:id', async (req, res) => {

    try {
        const { id } = req.params;
        await db.query('DELETE FROM CONTATOS WHERE ID_CONTATO = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/status_contratos', async (req, res) => {
    try {
        // Using "STATUS_CONTRATO" as per user request
        const result = await db.query('SELECT * FROM STATUS_CONTRATO');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/contratos:
 *   get:
 *     summary: List Contracts
 *     description: Returns all contracts with client and status details.
 *     responses:
 *       200:
 *         description: A list of contracts.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Contrato'
 */
app.get('/api/contratos', async (req, res) => {

    try {
        const query = `
            SELECT 
                C.ID_CONTRATO,
                C.ID_CLIENTE,
                CL.NOME_RAZAO,
                C.DATA_INICIO,
                C.DATA_FIM,
                C.VALOR_MENSAL,
                C.ID_STATUS,
                S.NOME as STATUS_NOME,
                C.SLAID,
                SLA.SLDESC as SLA_NOME,
                C.DESCRICAO,
                C.OBSERVACOES
            FROM CONTRATOS C
            LEFT JOIN CLIENTES CL ON C.ID_CLIENTE = CL.ID_CLIENTE
            LEFT JOIN STATUS_CONTRATO S ON C.ID_STATUS = S.ID_STATUS
            LEFT JOIN SLA ON C.SLAID = SLA.ID_SLA
        `;
        const result = await db.query(query);

        // Helper to convert BLOB (function/stream) to String
        const processBlob = (blob) => {
            return new Promise((resolve, reject) => {
                if (!blob) return resolve('');
                if (Buffer.isBuffer(blob)) return resolve(blob.toString());
                if (typeof blob === 'function') {
                    // node-firebird specific: blob(callback)
                    blob((err, name, eventEmitter) => {
                        if (err) return reject(err);
                        let data = '';
                        eventEmitter.on('data', chunk => data += chunk.toString());
                        eventEmitter.on('end', () => resolve(data));
                        eventEmitter.on('error', reject);
                    });
                } else {
                    resolve(blob.toString()); // Fallback
                }
            });
        };

        // Process all rows
        const parsedResult = await Promise.all(result.map(async row => ({
            ...row,
            OBSERVACOES: await processBlob(row.OBSERVACOES),
            DESCRICAO: await processBlob(row.DESCRICAO) // Just in case DESCRICAO becomes a BLOB later or is one now
        })));

        res.json(parsedResult);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/contratos:
 *   post:
 *     summary: Create Contract
 *     description: Adds a new contract to the database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contrato'
 *     responses:
 *       200:
 *         description: Contract created successfully.
 */
app.post('/api/contratos', async (req, res) => {

    const { ID_CLIENTE, DATA_INICIO, DATA_FIM, VALOR_MENSAL, ID_STATUS, SLAID, DESCRICAO, OBSERVACOES } = req.body;
    console.log("POST /api/contratos Payload:", req.body); // Debug Log
    try {
        const query = `
            INSERT INTO CONTRATOS (ID_CLIENTE, DATA_INICIO, DATA_FIM, VALOR_MENSAL, ID_STATUS, SLAID, DESCRICAO, OBSERVACOES)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING ID_CONTRATO
        `;
        const result = await db.query(query, [ID_CLIENTE, DATA_INICIO, DATA_FIM, VALOR_MENSAL, ID_STATUS, SLAID || null, DESCRICAO, OBSERVACOES]);
        console.log("Insert Result:", result); // Debug Log
        res.json({ success: true, id: result.ID_CONTRATO });
    } catch (error) {
        console.error("POST Contract Error:", error); // Debug Log
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/contratos/{id}:
 *   put:
 *     summary: Update Contract
 *     description: Updates an existing contract's details.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contrato'
 *     responses:
 *       200:
 *         description: Contract updated successfully.
 */
app.put('/api/contratos/:id', async (req, res) => {
    const { id } = req.params;
    const { ID_CLIENTE, DATA_INICIO, DATA_FIM, VALOR_MENSAL, ID_STATUS, SLAID, DESCRICAO, OBSERVACOES } = req.body;
    
    console.log(`[DEBUG] PUT /api/contratos/${id} - Payload:`, req.body);
    
    try {
        const query = `
            UPDATE CONTRATOS 
            SET ID_CLIENTE = ?, DATA_INICIO = ?, DATA_FIM = ?, VALOR_MENSAL = ?, ID_STATUS = ?, SLAID = ?, DESCRICAO = ?, OBSERVACOES = ?
            WHERE ID_CONTRATO = ?
        `;
        
        const params = [
            ID_CLIENTE || null, 
            DATA_INICIO || null, 
            DATA_FIM || null, 
            VALOR_MENSAL || 0, 
            ID_STATUS || null, 
            SLAID || null, 
            DESCRICAO || null, 
            OBSERVACOES || null, 
            id
        ];
        
        await db.query(query, params);
        console.log(`[DEBUG] PUT /api/contratos/${id} - Update successful`);
        res.json({ success: true });
    } catch (error) {
        console.error(`[ERROR] PUT /api/contratos/${id} -`, error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/contratos/{id}:
 *   delete:
 *     summary: Delete Contract
 *     description: Removes a contract from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contract deleted successfully.
 */
app.delete('/api/contratos/:id', async (req, res) => {

    const { id } = req.params;
    try {
        await db.query('DELETE FROM CONTRATOS WHERE ID_CONTRATO = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/status:
 *   get:
 *     summary: List Asset Statuses
 *     description: Returns all possible statuses for assets.
 *     responses:
 *       200:
 *         description: A list of status codes and names.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Status'
 */
app.get('/api/status', async (req, res) => {

    try {
        const result = await db.query('SELECT * FROM "STATUS"');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sla', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM SLA ORDER BY SLDESC');
        res.json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

/**
 * @openapi
 * /api/status:
 *   post:
 *     summary: Create Asset Status
 *     description: Adds a new asset status code.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Status'
 *     responses:
 *       200:
 *         description: Status created successfully.
 */
app.post('/api/status', async (req, res) => {
    const { STATUS } = req.body;
    try {
        const result = await db.query('INSERT INTO "STATUS" (STATUS) VALUES (?) RETURNING ID_STATUS', [STATUS]);
        res.json({ success: true, id: result.ID_STATUS });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/status/{id}:
 *   put:
 *     summary: Update Asset Status
 *     description: Updates an existing asset status name.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Status'
 *     responses:
 *       200:
 *         description: Status updated successfully.
 */
app.put('/api/status/:id', async (req, res) => {
    const { id } = req.params;
    const { STATUS } = req.body;
    try {
        await db.query('UPDATE "STATUS" SET STATUS=? WHERE ID_STATUS=?', [STATUS, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/status/{id}:
 *   delete:
 *     summary: Delete Asset Status
 *     description: Removes a status code from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Status deleted successfully.
 */
app.delete('/api/status/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM "STATUS" WHERE ID_STATUS=?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// ... Assets ...

/**
 * @openapi
 * /api/ativos:
 *   get:
 *     summary: List Assets
 *     description: Returns all assets with owner and status details.
 *     responses:
 *       200:
 *         description: A list of assets.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ativo'
 */
app.get('/api/ativos', async (req, res) => {

    try {
        const { cliente } = req.query;
        let query = `
            SELECT 
                A.ID_ATIVO,
                A.DESCRICAO,
                A.NUMERO_SERIE,
                A.ID_STATUS,
                S.STATUS as STATUS_NOME,
                A.ID_CLIENTE_PROPRIETARIO,
                C.NOME_RAZAO as PROPRIETARIO,
                A.ID_PRODUTO,
                AC.ID_CONTRATO
            FROM ATIVOS A
            LEFT JOIN CLIENTES C ON A.ID_CLIENTE_PROPRIETARIO = C.ID_CLIENTE
            LEFT JOIN "STATUS" S ON A.ID_STATUS = S.ID_STATUS
            LEFT JOIN ATIVOS_CONTRATOS AC ON A.ID_ATIVO = AC.ID_ATIVO
            WHERE 1=1
        `;
        const params = [];
        if (cliente) {
            query += ' AND A.ID_CLIENTE_PROPRIETARIO = ?';
            params.push(cliente);
        }
        const result = await db.query(query, params);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/ativos:
 *   post:
 *     summary: Create Asset
 *     description: Adds a new asset to the database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Ativo'
 *     responses:
 *       200:
 *         description: Asset created successfully.
 */
app.post('/api/ativos', async (req, res) => {
    const { DESCRICAO, NUMERO_SERIE, ID_STATUS, ID_CLIENTE_PROPRIETARIO, ID_PRODUTO, ID_CONTRATO } = req.body;
    try {
        const query = `
            INSERT INTO ATIVOS (DESCRICAO, NUMERO_SERIE, ID_STATUS, ID_CLIENTE_PROPRIETARIO, ID_PRODUTO)
            VALUES (?, ?, ?, ?, ?)
            RETURNING ID_ATIVO
        `;
        const result = await db.query(query, [sanitize(DESCRICAO), sanitize(NUMERO_SERIE), ID_STATUS, ID_CLIENTE_PROPRIETARIO, ID_PRODUTO]);

        const idAtivo = result.ID_ATIVO;

        // Se informou contrato, vincula
        if (ID_CONTRATO) {
            await db.query('INSERT INTO ATIVOS_CONTRATOS (ID_ATIVO, ID_CONTRATO) VALUES (?, ?)', [idAtivo, ID_CONTRATO]);
        }

        // Se já nascer em estoque (Status 2), sincroniza
        if (ID_STATUS == 2 && ID_PRODUTO) {
            await syncAssetToInventory(result.ID_ATIVO, 2);
        }

        res.json({ success: true, id: result.ID_ATIVO });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/ativos/{id}:
 *   put:
 *     summary: Update Asset
 *     description: Updates an existing asset's details.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Ativo'
 *     responses:
 *       200:
 *         description: Asset updated successfully.
 */
app.put('/api/ativos/:id', async (req, res) => {
    const { id } = req.params;
    const { DESCRICAO, NUMERO_SERIE, ID_STATUS, ID_CLIENTE_PROPRIETARIO, ID_PRODUTO, ID_CONTRATO } = req.body;
    try {
        // 1. Get current status to check for changes
        const currentAsset = (await db.query('SELECT ID_STATUS, ID_PRODUTO FROM ATIVOS WHERE ID_ATIVO = ?', [id]))[0];

        // 2. Update Asset
        const query = `UPDATE ATIVOS SET DESCRICAO=?, NUMERO_SERIE=?, ID_STATUS=?, ID_CLIENTE_PROPRIETARIO=?, ID_PRODUTO=? WHERE ID_ATIVO=?`;
        await db.query(query, [sanitize(DESCRICAO), sanitize(NUMERO_SERIE), ID_STATUS, ID_CLIENTE_PROPRIETARIO, ID_PRODUTO, id]);

        // 3. Sync Contract Relationship
        await db.query('DELETE FROM ATIVOS_CONTRATOS WHERE ID_ATIVO = ?', [id]);
        if (ID_CONTRATO) {
            await db.query('INSERT INTO ATIVOS_CONTRATOS (ID_ATIVO, ID_CONTRATO) VALUES (?, ?)', [id, ID_CONTRATO]);
        }

        // 4. If status changed to "Estoque" (2) and it wasn't before
        if (ID_STATUS == 2 && currentAsset && currentAsset.ID_STATUS != 2) {
            await syncAssetToInventory(id, 2);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper to sync Asset entry to Inventory balance
async function syncAssetToInventory(idAtivo, statusId) {
    if (statusId != 2) return; // Só interessa se for estoque (2)

    try {
        const asset = (await db.query('SELECT ID_PRODUTO, DESCRICAO FROM ATIVOS WHERE ID_ATIVO = ?', [idAtivo]))[0];
        if (!asset || !asset.ID_PRODUTO) return;

        console.log(`Sincronizando Ativo ${idAtivo} para Estoque do Produto ${asset.ID_PRODUTO}`);

        // 1. Incrementar Saldo Atual
        await db.query('UPDATE PRODUTOS SET SALDO_ATUAL = SALDO_ATUAL + 1 WHERE ID_PRODUTO = ?', [asset.ID_PRODUTO]);

        // 2. Registrar Movimentação de Entrada
        const movQuery = `
            INSERT INTO MOVIMENTACOES_ESTOQUE (ID_PRODUTO, TIPO, QUANTIDADE, MOTIVO, DATA_MOV)
            VALUES (?, 'E', 1, ?, CURRENT_TIMESTAMP)
        `;
        await db.query(movQuery, [asset.ID_PRODUTO, `RETORNO DE ATIVO: ${asset.DESCRICAO} (ID: ${idAtivo})`]);

        // 3. Desvincular Cliente/Contrato no registro do ativo
        // Resetamos o proprietário para NULL (Próprio) e removemos o vínculo com qualquer contrato
        await db.query('UPDATE ATIVOS SET ID_CLIENTE_PROPRIETARIO = NULL WHERE ID_ATIVO = ?', [idAtivo]);
        await db.query('DELETE FROM ATIVOS_CONTRATOS WHERE ID_ATIVO = ?', [idAtivo]);

    } catch (e) {
        console.error('Erro ao sincronizar ativo com estoque:', e);
        throw e;
    }
}

/**
 * @openapi
 * /api/ativos/{id}:
 *   delete:
 *     summary: Delete Asset
 *     description: Removes an asset from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asset deleted successfully.
 */
app.delete('/api/ativos/:id', async (req, res) => {

    try {
        await db.query('DELETE FROM ATIVOS WHERE ID_ATIVO = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ... Users ...

app.get('/api/perfis', async (req, res) => {
    try { res.json(await db.query('SELECT * FROM PERFIS')); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/perfis:
 *   post:
 *     summary: Create Profile
 *     description: Adds a new user profile.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NOME: { type: 'string' }
 *     responses:
 *       200:
 *         description: Profile created successfully.
 */
app.post('/api/perfis', async (req, res) => {
    const { NOME } = req.body;
    const permissions = req.body;
    const permissionCols = [
        'CAN_DASHBOARD', 'CAN_CLIENTS', 'CAN_CHAMADOS', 'CAN_CONTRACTS',
        'CAN_ASSETS', 'CAN_AGENDA', 'CAN_USERS', 'CAN_TECNICOS',
        'CAN_ESPECIALIDADES', 'CAN_ESTOQUE', 'CAN_FORNECEDORES',
        'CAN_REPORTS', 'CAN_SETTINGS'
    ];

    try {
        let cols = ['NOME'];
        let values = [NOME];

        permissionCols.forEach(col => {
            if (permissions[col] !== undefined) {
                cols.push(col);
                values.push(permissions[col]);
            }
        });

        const placeholders = cols.map(() => '?').join(',');
        const query = `INSERT INTO PERFIS (${cols.join(', ')}) VALUES (${placeholders}) RETURNING ID_PERFIL`;
        const result = await db.query(query, values);
        res.json({ success: true, id: result.ID_PERFIL });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/perfis/{id}:
 *   put:
 *     summary: Update Profile
 *     description: Updates an existing user profile.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NOME: { type: 'string' }
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 */
app.put('/api/perfis/:id', async (req, res) => {
    const { id } = req.params;
    const { NOME } = req.body;
    const permissions = req.body;
    const permissionCols = [
        'CAN_DASHBOARD', 'CAN_CLIENTS', 'CAN_CHAMADOS', 'CAN_CONTRACTS',
        'CAN_ASSETS', 'CAN_AGENDA', 'CAN_USERS', 'CAN_TECNICOS',
        'CAN_ESPECIALIDADES', 'CAN_ESTOQUE', 'CAN_FORNECEDORES',
        'CAN_REPORTS', 'CAN_SETTINGS'
    ];

    try {
        let sets = ['NOME = ?'];
        let values = [NOME];

        permissionCols.forEach(col => {
            if (permissions[col] !== undefined) {
                sets.push(`${col} = ?`);
                values.push(permissions[col]);
            }
        });

        values.push(id);
        const query = `UPDATE PERFIS SET ${sets.join(', ')} WHERE ID_PERFIL = ?`;
        await db.query(query, values);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/perfis/{id}:
 *   delete:
 *     summary: Delete Profile
 *     description: Removes a user profile from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Profile deleted successfully.
 */
app.delete('/api/perfis/:id', async (req, res) => {

    try {
        await db.query('DELETE FROM PERFIS WHERE ID_PERFIL=?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


app.get('/api/usuarios', async (req, res) => {
    try {
        const query = `
            SELECT U.ID_USUARIO, U.NOME, U.EMAIL, U.ID_PERFIL, P.NOME as PERFIL
            FROM USUARIOS U
            LEFT JOIN PERFIS P ON U.ID_PERFIL = P.ID_PERFIL
        `;
        const result = await db.query(query);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/usuarios', async (req, res) => {
    const { NOME, EMAIL, SENHA, ID_PERFIL } = req.body;
    try {
        const query = `INSERT INTO USUARIOS (NOME, EMAIL, SENHA, ID_PERFIL) VALUES (?, ?, ?, ?) RETURNING ID_USUARIO`;
        const result = await db.query(query, [NOME, EMAIL, SENHA, ID_PERFIL]);
        res.json({ success: true, id: result.ID_USUARIO });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { NOME, EMAIL, SENHA, ID_PERFIL } = req.body;
    try {
        // If password is blank/null, don't update it
        let query, params;
        if (SENHA) {
            query = `UPDATE USUARIOS SET NOME=?, EMAIL=?, SENHA=?, ID_PERFIL=? WHERE ID_USUARIO=?`;
            params = [NOME, EMAIL, SENHA, ID_PERFIL, id];
        } else {
            query = `UPDATE USUARIOS SET NOME=?, EMAIL=?, ID_PERFIL=? WHERE ID_USUARIO=?`;
            params = [NOME, EMAIL, ID_PERFIL, id];
        }
        await db.query(query, params);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM USUARIOS WHERE ID_USUARIO=?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Simple plain text check as per existing DB
        const query = `
            SELECT U.*, P.*
            FROM USUARIOS U
            LEFT JOIN PERFIS P ON U.ID_PERFIL = P.ID_PERFIL
            WHERE U.EMAIL = ? AND U.SENHA = ?
        `;
        const result = await db.query(query, [email, password]);

        if (result.length > 0) {
            const user = result[0];
            // Don't send password back
            delete user.SENHA;
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ... Agenda & Support ...

// 1. Get Contacts (Optional filter by Client)
app.get('/api/contatos', async (req, res) => {
    const { cliente } = req.query;
    try {
        let query = 'SELECT * FROM CONTATOS';
        let params = [];
        if (cliente) {
            query += ' WHERE ID_CLIENTE = ?';
            params.push(cliente);
        }
        const result = await db.query(query, params);
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Get Contracts by Client
app.get('/api/contratos/cliente/:id', async (req, res) => {
    try {
        // Select active contracts for this client
        const query = `
            SELECT C.ID_CONTRATO, C.DESCRICAO, S.NOME as STATUS, C.SLAID
            FROM CONTRATOS C
            LEFT JOIN STATUS_CONTRATO S ON C.ID_STATUS = S.ID_STATUS
            WHERE C.ID_CLIENTE = ?
        `;
        const result = await db.query(query, [req.params.id]);

        // Helper to convert BLOB (function/stream) to String (reused)
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
                    resolve(blob.toString());
                }
            });
        };

        const parsed = await Promise.all(result.map(async r => ({
            ...r,
            DESCRICAO: await processBlob(r.DESCRICAO)
        })));

        res.json(parsed);

    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Get Available Assets (Status "Estoque" = 2 usually, or filter all)
app.get('/api/ativos/disponiveis', async (req, res) => {
    try {
        const { contrato } = req.query;

        let query = `
            SELECT A.ID_ATIVO, A.DESCRICAO, A.NUMERO_SERIE, S.STATUS
            FROM ATIVOS A
            LEFT JOIN "STATUS" S ON A.ID_STATUS = S.ID_STATUS
            WHERE (S.STATUS LIKE '%Estoque%' OR S.STATUS LIKE '%Disponivel%' OR A.ID_STATUS = 2)
        `;

        const params = [];

        if (contrato) {
            query = `
                SELECT A.ID_ATIVO, A.DESCRICAO, A.NUMERO_SERIE, S.STATUS
                FROM ATIVOS A
                JOIN ATIVOS_CONTRATOS AC ON A.ID_ATIVO = AC.ID_ATIVO
                LEFT JOIN "STATUS" S ON A.ID_STATUS = S.ID_STATUS
                WHERE AC.ID_CONTRATO = ?
                AND (S.STATUS LIKE '%Estoque%' OR S.STATUS LIKE '%Disponivel%' OR A.ID_STATUS = 2)
            `;
            params.push(contrato);
        }

        const result = await db.query(query, params);
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/contratos/:id/ativos/count', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT COUNT(*) as QTD FROM ATIVOS_CONTRATOS WHERE ID_CONTRATO = ?', [id]);
        res.json({ count: result[0].QTD });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/contratos/:id/ativos', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT A.ID_ATIVO, A.DESCRICAO, A.NUMERO_SERIE, S.STATUS as STATUS_NOME
            FROM ATIVOS A
            JOIN ATIVOS_CONTRATOS AC ON A.ID_ATIVO = AC.ID_ATIVO
            LEFT JOIN "STATUS" S ON A.ID_STATUS = S.ID_STATUS
            WHERE AC.ID_CONTRATO = ?
        `;
        const result = await db.query(query, [id]);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. Agendamentos CRUD
app.get('/api/agendamentos', async (req, res) => {
    const { cliente, contrato } = req.query;
    try {
        let query = `
            SELECT 
                AG.ID_AGENDA,
                AG.ID_CLIENTE, C.NOME_RAZAO as CLIENTE_NOME,
                AG.ID_CONTATO, CT.NOME_CONTATO,
                AG.ID_CONTRATO, CN.DESCRICAO as CONTRATO_DESC,
                AG.ID_ATIVO, A.DESCRICAO as ATIVO_DESC, A.NUMERO_SERIE,
                AG.DATA_RETIRADA,
                AG.HORARIO_INICIO,
                AG.HORARIO_FIM,
                AG.DATA_DEVOLUCAO_PREVISTA,
                AG.DATA_DEVOLUCAO,
                AG.OBSERVACAO,
                AG.ID_STATUS, S.STATUS as STATUS_NOME,
                AG.QUANTIDADE
            FROM AGENDA AG
            LEFT JOIN CLIENTES C ON AG.ID_CLIENTE = C.ID_CLIENTE
            LEFT JOIN CONTATOS CT ON AG.ID_CONTATO = CT.ID_CONTATO
            LEFT JOIN CONTRATOS CN ON AG.ID_CONTRATO = CN.ID_CONTRATO
            LEFT JOIN ATIVOS A ON AG.ID_ATIVO = A.ID_ATIVO
            LEFT JOIN "STATUS" S ON AG.ID_STATUS = S.ID_STATUS
        `;
        // Note: STATUS for Agenda might be different than Contract Status, 
        // but user schema check didn't show a specific STATUS_AGENDA table. 
        // Assuming it uses 'STATUS_CONTRATO' or just a simple ID.
        // If it linked to "STATUS" (assets), we would join that.
        // Let's assume it shares STATUS_CONTRATO or has no FK for now, 
        // will adjust if user complains about status names.

        let conditions = [];
        let params = [];

        if (cliente) { conditions.push('AG.ID_CLIENTE = ?'); params.push(cliente); }
        if (contrato) { conditions.push('AG.ID_CONTRATO = ?'); params.push(contrato); }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY AG.DATA_RETIRADA DESC';

        const result = await db.query(query, params);

        // Fetch Technicians separately to avoid LIST() issues (Firebird version compatibility)
        // We fetch all technicians for these agendas. Optimization: could filter by IDs in result if result is small.
        // For now, fetching all relevant agenda_technicians is safe enough.
        // We'll construct a map ID_AGENDA -> List of Techs
        const techQuery = `
            SELECT AGT.ID_AGENDA, AGT.ID_TECNICO, T.NOME
            FROM AGENDA_TECNICOS AGT
            JOIN TECNICOS T ON AGT.ID_TECNICO = T.ID_TECNICO
        `;
        const techResult = await db.query(techQuery);
        const techMap = {};
        techResult.forEach(row => {
            if (!techMap[row.ID_AGENDA]) techMap[row.ID_AGENDA] = [];
            techMap[row.ID_AGENDA].push(row);
        });

        // Process BLOBs (Observacao)
        // Helper to convert BLOB (function/stream) to String (reused)
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
                    resolve(blob.toString());
                }
            });
        };

        const parsed = await Promise.all(result.map(async r => {
            // Attach Techs
            const techs = techMap[r.ID_AGENDA] || [];
            const techNames = techs.map(t => t.NOME).join(', ');
            const techIds = techs.map(t => t.ID_TECNICO).join(',');

            return {
                ...r,
                OBSERVACAO: await processBlob(r.OBSERVACAO),
                CONTRATO_DESC: await processBlob(r.CONTRATO_DESC),
                TECNICOS_IDS: techIds,
                TECNICOS_NOMES: techNames
            };
        }));

        res.json(parsed);

    } catch (e) {
        console.error('GET /api/agendamentos error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/agendamentos', async (req, res) => {
    let { ID_CLIENTE, ID_CONTATO, ID_CONTRATO, ID_ATIVO, DATA_RETIRADA, HORARIO_INICIO, HORARIO_FIM, DATA_DEVOLUCAO_PREVISTA, DATA_DEVOLUCAO, OBSERVACAO, ID_STATUS, QUANTIDADE } = req.body;

    // Sanitize input: Convert empty strings to NULL for Firebird compatibility
    if (ID_CLIENTE === '') ID_CLIENTE = null;
    if (ID_CONTATO === '') ID_CONTATO = null;
    if (ID_CONTRATO === '') ID_CONTRATO = null;
    if (ID_ATIVO === '') ID_ATIVO = null;
    if (DATA_RETIRADA === '') DATA_RETIRADA = null;
    if (HORARIO_INICIO === '') HORARIO_INICIO = null;
    if (HORARIO_FIM === '') HORARIO_FIM = null;
    if (DATA_DEVOLUCAO_PREVISTA === '') DATA_DEVOLUCAO_PREVISTA = null;
    if (DATA_DEVOLUCAO === '') DATA_DEVOLUCAO = null;
    if (ID_STATUS === '') ID_STATUS = null;

    try {
        const query = `
            INSERT INTO AGENDA (ID_CLIENTE, ID_CONTATO, ID_CONTRATO, ID_ATIVO, DATA_RETIRADA, HORARIO_INICIO, HORARIO_FIM, DATA_DEVOLUCAO_PREVISTA, DATA_DEVOLUCAO, OBSERVACAO, ID_STATUS, QUANTIDADE)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING ID_AGENDA
        `;
        const result = await db.query(query, [
            ID_CLIENTE, ID_CONTATO, ID_CONTRATO, ID_ATIVO, DATA_RETIRADA, HORARIO_INICIO, HORARIO_FIM, DATA_DEVOLUCAO_PREVISTA, DATA_DEVOLUCAO, OBSERVACAO, ID_STATUS, QUANTIDADE
        ]);

        const newAgendaId = result.ID_AGENDA;

        // Handle Technicians (Array of IDs in req.body.tecnicos)
        if (req.body.tecnicos && Array.isArray(req.body.tecnicos)) {
            for (const techId of req.body.tecnicos) {
                await db.query('INSERT INTO AGENDA_TECNICOS (ID_AGENDA, ID_TECNICO) VALUES (?, ?)', [newAgendaId, techId]);
            }
        }

        res.json({ success: true, id: newAgendaId });
    } catch (error) {
        console.error('POST /api/agendamentos error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 5. Technicians & Specialties logic is further down... same file structure preserved

app.put('/api/agendamentos/:id', async (req, res) => {
    const { id } = req.params;
    console.log('PUT /api/agendamentos/:id received:', id, req.body); // DEBUG
    let { ID_CLIENTE, ID_CONTATO, ID_CONTRATO, ID_ATIVO, DATA_RETIRADA, HORARIO_INICIO, HORARIO_FIM, DATA_DEVOLUCAO_PREVISTA, DATA_DEVOLUCAO, OBSERVACAO, ID_STATUS, QUANTIDADE, tecnicos } = req.body;

    // Sanitize input: Convert empty strings to NULL for Firebird compatibility
    if (ID_CLIENTE === '') ID_CLIENTE = null;
    if (ID_CONTATO === '') ID_CONTATO = null;
    if (ID_CONTRATO === '') ID_CONTRATO = null;
    if (ID_ATIVO === '') ID_ATIVO = null;
    if (DATA_RETIRADA === '') DATA_RETIRADA = null;
    if (HORARIO_INICIO === '') HORARIO_INICIO = null;
    if (HORARIO_FIM === '') HORARIO_FIM = null;
    if (DATA_DEVOLUCAO_PREVISTA === '') DATA_DEVOLUCAO_PREVISTA = null;
    if (DATA_DEVOLUCAO === '') DATA_DEVOLUCAO = null;
    if (ID_STATUS === '') ID_STATUS = null;

    try {
        const query = `
            UPDATE AGENDA SET
            ID_CLIENTE =?, ID_CONTATO =?, ID_CONTRATO =?, ID_ATIVO =?,
            DATA_RETIRADA =?, HORARIO_INICIO =?, HORARIO_FIM =?, DATA_DEVOLUCAO_PREVISTA =?, DATA_DEVOLUCAO =?,
            OBSERVACAO =?, ID_STATUS =?, QUANTIDADE =?
            WHERE ID_AGENDA =?
            `;
        await db.query(query, [ID_CLIENTE, ID_CONTATO, ID_CONTRATO, ID_ATIVO, DATA_RETIRADA, HORARIO_INICIO, HORARIO_FIM, DATA_DEVOLUCAO_PREVISTA, DATA_DEVOLUCAO, OBSERVACAO, ID_STATUS, QUANTIDADE, id]);

        // If returned (Data Devolucao Set), free the asset and sync to inventory
        if (DATA_DEVOLUCAO && ID_ATIVO) {
            await db.query('UPDATE ATIVOS SET ID_STATUS = 2 WHERE ID_ATIVO = ?', [ID_ATIVO]);
            await syncAssetToInventory(ID_ATIVO, 2);
        }

        // --- UPDATE TECHNICIANS ---
        if (tecnicos && Array.isArray(tecnicos)) {
            // 1. Delete existing for this agenda
            await db.query('DELETE FROM AGENDA_TECNICOS WHERE ID_AGENDA = ?', [id]);

            // 2. Insert new list
            for (const techId of tecnicos) {
                await db.query('INSERT INTO AGENDA_TECNICOS (ID_AGENDA, ID_TECNICO) VALUES (?, ?)', [id, techId]);
            }
        }

        res.json({ success: true });
    } catch (e) {
        console.error('PUT /api/agendamentos error:', e);
        res.status(500).json({ error: e.message });
    }
});

// 5. Technicians & Specialties

/**
 * @openapi
 * /api/tecnicos:
 *   get:
 *     summary: List Technicians
 *     description: Returns all technicians with their specialties.
 *     responses:
 *       200:
 *         description: A list of technicians.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tecnico'
 */
app.get('/api/tecnicos', async (req, res) => {

    try {
        const query = `
                SELECT T.*, 
                CAST((SELECT LIST(E.NOME, ', ') FROM TECNICO_ESPECIALIDADES TE JOIN ESPECIALIDADES E ON TE.ID_ESPECIALIDADE = E.ID_ESPECIALIDADE WHERE TE.ID_TECNICO = T.ID_TECNICO) AS VARCHAR(8190)) as ESPECIALIDADES,
                CAST((SELECT LIST(TE.ID_ESPECIALIDADE, ',') FROM TECNICO_ESPECIALIDADES TE WHERE TE.ID_TECNICO = T.ID_TECNICO) AS VARCHAR(8190)) as ESPECIALIDADES_IDS
                FROM TECNICOS T
            `;
        const result = await db.query(query);

        if (result.length > 0) {
            console.log("GET /api/tecnicos Sample Row (Pre-Process):", result[0]); // DEBUG
        }

        // Helper to read Firebird BLOBs (Functions/Streams)
        const readBlob = (val, fieldName) => new Promise((resolve, reject) => {
            try {
                if (typeof val === 'function') {
                    val((err, name, stream) => {
                        if (err) {
                            console.error(`Error opening BLOB ${fieldName}:`, err);
                            return resolve(null); // Resolve null on error to avoid crash
                        }
                        let data = '';
                        stream.on('data', chunk => data += chunk.toString());
                        stream.on('end', () => resolve(data));
                        stream.on('error', (err) => {
                            console.error(`Stream error BLOB ${fieldName}:`, err);
                            resolve(null);
                        });
                    });
                } else {
                    // If Buffer, toString. If String/Null, return as is.
                    resolve(val && Buffer.isBuffer(val) ? val.toString() : val);
                }
            } catch (e) {
                console.error(`Exception reading BLOB ${fieldName}:`, e);
                resolve(null);
            }
        });

        // Convert concurrently
        const formatted = await Promise.all(result.map(async row => ({
            ...row,
            ESPECIALIDADES: await readBlob(row.ESPECIALIDADES, 'ESPECIALIDADES'),
            ESPECIALIDADES_IDS: await readBlob(row.ESPECIALIDADES_IDS, 'ESPECIALIDADES_IDS')
        })));

        if (formatted.length > 0) {
            console.log("GET /api/tecnicos Sample Row (Post-Process):", formatted[0]); // DEBUG
        }

        res.json(formatted);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/tecnicos:
 *   post:
 *     summary: Create Technician
 *     description: Adds a new technician and their specialties.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tecnico'
 *     responses:
 *       200:
 *         description: Technician created successfully.
 */
app.post('/api/tecnicos', async (req, res) => {

    const { NOME, CPF, EMAIL, TELEFONE, especialidades } = req.body;
    console.log("POST /api/tecnicos", req.body); // Debug
    try {
        const query = `INSERT INTO TECNICOS (NOME, CPF, EMAIL, TELEFONE) VALUES (?, ?, ?, ?) RETURNING ID_TECNICO`;
        const result = await db.query(query, [NOME, CPF, EMAIL, TELEFONE]);
        const newTechId = result.ID_TECNICO;

        if (especialidades && Array.isArray(especialidades)) {
            for (const espId of especialidades) {
                // Manual ID generation to avoid missing trigger issues
                const genRes = await db.query('SELECT GEN_ID(GEN_TECNICO_ESPECIALIDADES_ID, 1) as NID FROM RDB$DATABASE');
                const newId = genRes[0].NID;
                console.log(`Inserting Speciality ${espId} for Tech ${newTechId} with ID ${newId}`);
                await db.query('INSERT INTO TECNICO_ESPECIALIDADES (ID_TECNICO_ESPECIALIDADE, ID_TECNICO, ID_ESPECIALIDADE) VALUES (?, ?, ?)', [newId, newTechId, espId]);
            }
        }
        res.json({ success: true, id: newTechId });
    } catch (e) {
        console.error("Error creating technician:", e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * @openapi
 * /api/tecnicos/{id}:
 *   put:
 *     summary: Update Technician
 *     description: Updates an existing technician's details and specialties.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tecnico'
 *     responses:
 *       200:
 *         description: Technician updated successfully.
 */
app.put('/api/tecnicos/:id', async (req, res) => {

    const { id } = req.params;
    const { NOME, CPF, EMAIL, TELEFONE, especialidades } = req.body;
    console.log(`PUT /api/tecnicos/${id}`, req.body); // Debug
    try {
        await db.query('UPDATE TECNICOS SET NOME=?, CPF=?, EMAIL=?, TELEFONE=? WHERE ID_TECNICO=?', [NOME, CPF, EMAIL, TELEFONE, id]);

        // Update Specialties
        if (especialidades && Array.isArray(especialidades)) {
            // 1. Delete existing
            await db.query('DELETE FROM TECNICO_ESPECIALIDADES WHERE ID_TECNICO=?', [id]);

            // 2. Insert new
            console.log(`PUT /api/tecnicos/${id} - Inserting ${especialidades.length} specialties`); // DEBUG
            for (const espId of especialidades) {
                const genRes = await db.query('SELECT GEN_ID(GEN_TECNICO_ESPECIALIDADES_ID, 1) as NID FROM RDB$DATABASE');
                const newId = genRes[0].NID;
                console.log(`PUT Loop: Inserting Spec ${espId} for Tech ${id} with ID ${newId}`); // DEBUG
                await db.query('INSERT INTO TECNICO_ESPECIALIDADES (ID_TECNICO_ESPECIALIDADE, ID_TECNICO, ID_ESPECIALIDADE) VALUES (?, ?, ?)', [newId, id, espId]);
            }
        }
        res.json({ success: true });
    } catch (e) {
        console.error("Error updating technician:", e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * @openapi
 * /api/tecnicos/{id}:
 *   delete:
 *     summary: Delete Technician
 *     description: Removes a technician from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Technician deleted successfully.
 */
app.delete('/api/tecnicos/:id', async (req, res) => {

    const { id } = req.params;
    try {
        await db.query('DELETE FROM TECNICOS WHERE ID_TECNICO=?', [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/especialidades:
 *   get:
 *     summary: List Specialties
 *     description: Returns all technician specialties.
 *     responses:
 *       200:
 *         description: A list of specialties.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Especialidade'
 */
app.get('/api/especialidades', async (req, res) => {

    try { res.json(await db.query('SELECT * FROM ESPECIALIDADES')); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/especialidades:
 *   post:
 *     summary: Create Specialty
 *     description: Adds a new technician specialty.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Especialidade'
 *     responses:
 *       200:
 *         description: Specialty created successfully.
 */
app.post('/api/especialidades', async (req, res) => {

    const { NOME } = req.body;
    try {
        const result = await db.query('INSERT INTO ESPECIALIDADES (NOME) VALUES (?) RETURNING ID_ESPECIALIDADE', [NOME]);
        res.json({ success: true, id: result.ID_ESPECIALIDADE });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/especialidades/{id}:
 *   put:
 *     summary: Update Specialty
 *     description: Updates an existing specialty.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Especialidade'
 *     responses:
 *       200:
 *         description: Specialty updated successfully.
 */
app.put('/api/especialidades/:id', async (req, res) => {

    const { id } = req.params;
    const { NOME } = req.body;
    try {
        await db.query('UPDATE ESPECIALIDADES SET NOME=? WHERE ID_ESPECIALIDADE=?', [NOME, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/especialidades/{id}:
 *   delete:
 *     summary: Delete Specialty
 *     description: Removes a specialty from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Specialty deleted successfully.
 */
app.delete('/api/especialidades/:id', async (req, res) => {

    const { id } = req.params;
    try {
        await db.query('DELETE FROM ESPECIALIDADES WHERE ID_ESPECIALIDADE=?', [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/agendamentos/{id}:
 *   delete:
 *     summary: Delete Appointment
 *     description: Removes an appointment from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Appointment deleted successfully.
 */
app.delete('/api/agendamentos/:id', async (req, res) => {

    try {
        await db.query('DELETE FROM AGENDA WHERE ID_AGENDA = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/pagamentos:
 *   get:
 *     summary: List Payments
 *     description: Returns all payments from the database.
 *     responses:
 *       200:
 *         description: A list of payments.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pagamento'
 */
app.get('/api/pagamentos', async (req, res) => {
    try { res.json(await db.query('SELECT * FROM PAGAMENTOS')); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/pagamentos:
 *   post:
 *     summary: Create Payment
 *     description: Adds a new payment record.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Pagamento'
 *     responses:
 *       200:
 *         description: Payment created successfully.
 */
app.post('/api/pagamentos', async (req, res) => {
    const { ID_CONTRATO, DATA_VENCIMENTO, DATA_PAGAMENTO, VALOR_PAGO, STATUS_PAGAMENTO } = req.body;
    try {
        const query = `INSERT INTO PAGAMENTOS (ID_CONTRATO, DATA_VENCIMENTO, DATA_PAGAMENTO, VALOR_PAGO, STATUS_PAGAMENTO) VALUES (?, ?, ?, ?, ?) RETURNING ID_PAGAMENTO`;
        const result = await db.query(query, [ID_CONTRATO, DATA_VENCIMENTO, DATA_PAGAMENTO, VALOR_PAGO, STATUS_PAGAMENTO]);
        res.json({ success: true, id: result.ID_PAGAMENTO });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/pagamentos/{id}:
 *   put:
 *     summary: Update Payment
 *     description: Updates an existing payment record.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Pagamento'
 *     responses:
 *       200:
 *         description: Payment updated successfully.
 */
app.put('/api/pagamentos/:id', async (req, res) => {
    const { id } = req.params;
    const { ID_CONTRATO, DATA_VENCIMENTO, DATA_PAGAMENTO, VALOR_PAGO, STATUS_PAGAMENTO } = req.body;
    try {
        const query = `UPDATE PAGAMENTOS SET ID_CONTRATO=?, DATA_VENCIMENTO=?, DATA_PAGAMENTO=?, VALOR_PAGO=?, STATUS_PAGAMENTO=? WHERE ID_PAGAMENTO=?`;
        await db.query(query, [ID_CONTRATO, DATA_VENCIMENTO, DATA_PAGAMENTO, VALOR_PAGO, STATUS_PAGAMENTO, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/pagamentos/{id}:
 *   delete:
 *     summary: Delete Payment
 *     description: Removes a payment record from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment deleted successfully.
 */
app.delete('/api/pagamentos/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM PAGAMENTOS WHERE ID_PAGAMENTO=?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/auditoria:
 *   get:
 *     summary: List Audit Logs
 *     description: Returns the CRM audit logs.
 *     responses:
 *       200:
 *         description: A list of audit logs.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Auditoria'
 */
app.get('/api/auditoria', async (req, res) => {
    try { res.json(await db.query('SELECT FIRST 100 * FROM AUDITORIA ORDER BY DATA_HORA DESC')); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/permissoes:
 *   get:
 *     summary: List Permissions
 *     description: Returns all screen permissions for profiles.
 *     responses:
 *       200:
 *         description: A list of permissions.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Permissao'
 */
app.get('/api/permissoes', async (req, res) => {
    try { res.json(await db.query('SELECT * FROM PERMISSOES')); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/permissoes:
 *   post:
 *     summary: Create Permission
 *     description: Adds a new screen permission for a profile.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Permissao'
 *     responses:
 *       200:
 *         description: Permission created successfully.
 */
app.post('/api/permissoes', async (req, res) => {

    const { ID_PERFIL, ID_SCREEN, CAN_VIEW, CAN_EDIT, CAN_DELETE } = req.body;
    try {
        await db.query('INSERT INTO PERMISSOES (ID_PERFIL, ID_SCREEN, CAN_VIEW, CAN_EDIT, CAN_DELETE) VALUES (?, ?, ?, ?, ?)', [ID_PERFIL, ID_SCREEN, CAN_VIEW, CAN_EDIT, CAN_DELETE]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * @openapi
 * /api/permissoes:
 *   delete:
 *     summary: Delete Permission
 *     description: Removes a screen permission.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ID_PERFIL: { type: 'integer' }
 *               ID_SCREEN: { type: 'integer' }
 *     responses:
 *       200:
 *         description: Permission deleted successfully.
 */
app.delete('/api/permissoes', async (req, res) => {

    const { ID_PERFIL, ID_SCREEN } = req.body;
    try {
        await db.query('DELETE FROM PERMISSOES WHERE ID_PERFIL=? AND ID_SCREEN=?', [ID_PERFIL, ID_SCREEN]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


/**
 * @openapi
 * /api/acoes:
 *   get:
 *     summary: List Actions
 *     description: Returns all audit actions.
 *     responses:
 *       200:
 *         description: A list of actions.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Acao'
 */
app.get('/api/acoes', async (req, res) => {
    try { res.json(await db.query('SELECT * FROM ACOES')); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/acoes', async (req, res) => {
    const { NOME, DESCRICAO } = req.body;
    try {
        const result = await db.query('INSERT INTO ACOES (NOME, DESCRICAO) VALUES (?, ?) RETURNING ID_ACAO', [NOME, DESCRICAO]);
        res.json({ success: true, id: result.ID_ACAO });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/acoes/:id', async (req, res) => {
    const { id } = req.params;
    const { NOME, DESCRICAO } = req.body;
    try {
        await db.query('UPDATE ACOES SET NOME=?, DESCRICAO=? WHERE ID_ACAO=?', [NOME, DESCRICAO, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/acoes/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM ACOES WHERE ID_ACAO=?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// --- INVENTORY (ESTOQUE) ROUTES ---

/**
 * @openapi
 * /api/produtos:
 *   get:
 *     summary: List Products
 *     description: Returns all products in the inventory.
 *     responses:
 *       200:
 *         description: A list of products.
 */
app.get('/api/produtos', async (req, res) => {
    try {
        console.log('GET /api/produtos - Iniciando query...');
        const query = `
            SELECT P.*, F.RAZAO_SOCIAL as FORNECEDOR_NOME
            FROM PRODUTOS P
            LEFT JOIN FORNECEDORES F ON P.ID_FORNECEDOR = F.ID_FORNECEDOR
            WHERE P.ATIVO = 'S'
            ORDER BY P.NOME
        `;
        const result = await db.query(query);
        console.log('GET /api/produtos - Sucesso, itens retornados:', result.length);
        res.json(result);
    } catch (error) {
        console.error('Error in GET /api/produtos:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/produtos:
 *   post:
 *     summary: Create Product
 *     description: Adds a new product to the inventory.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NOME: { type: 'string' }
 *               DESCRICAO: { type: 'string' }
 *               UNIDADE: { type: 'string' }
 *               PRECO_VENDA: { type: 'number' }
 *     responses:
 *       200:
 *         description: Product created successfully.
 */
app.post('/api/produtos', async (req, res) => {
    const { NOME, DESCRICAO, UNIDADE, PRECO_VENDA, DATA_COMPRA, NUMERO_NF, ID_FORNECEDOR } = req.body;
    try {
        const query = `
            INSERT INTO PRODUTOS (NOME, DESCRICAO, UNIDADE, PRECO_VENDA, SALDO_ATUAL, ATIVO, DATA_COMPRA, NUMERO_NF, ID_FORNECEDOR)
            VALUES (?, ?, ?, ?, 0, 'S', ?, ?, ?)
            RETURNING ID_PRODUTO
        `;
        const result = await db.query(query, [
            sanitize(NOME), sanitize(DESCRICAO), sanitize(UNIDADE) || 'UN',
            PRECO_VENDA || 0, DATA_COMPRA || null, sanitize(NUMERO_NF) || null, ID_FORNECEDOR || null
        ]);
        res.json({ success: true, id: result.ID_PRODUTO });
    } catch (error) {
        console.error('Error in POST /api/produtos:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/produtos/{id}:
 *   put:
 *     summary: Update Product
 *     description: Updates an existing product's details.
 */
app.put('/api/produtos/:id', async (req, res) => {
    const { id } = req.params;
    const { NOME, DESCRICAO, UNIDADE, PRECO_VENDA, ATIVO, DATA_COMPRA, NUMERO_NF, ID_FORNECEDOR } = req.body;
    try {
        const query = `
            UPDATE PRODUTOS 
            SET NOME = ?, DESCRICAO = ?, UNIDADE = ?, PRECO_VENDA = ?, ATIVO = ?, 
                DATA_COMPRA = ?, NUMERO_NF = ?, ID_FORNECEDOR = ?
            WHERE ID_PRODUTO = ?
        `;
        await db.query(query, [
            sanitize(NOME), sanitize(DESCRICAO), sanitize(UNIDADE), PRECO_VENDA, ATIVO || 'S',
            DATA_COMPRA || null, sanitize(NUMERO_NF) || null, ID_FORNECEDOR || null, id
        ]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/produtos/{id}:
 *   delete:
 *     summary: Delete Product
 *     description: Logically deletes a product by setting ATIVO = 'N'.
 */
app.delete('/api/produtos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE PRODUTOS SET ATIVO = \'N\' WHERE ID_PRODUTO = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/movimentacoes:
 *   get:
 *     summary: List Movements
 *     description: Returns all stock movements with product details.
 */
app.get('/api/movimentacoes', async (req, res) => {
    try {
        const query = `
            SELECT 
                M.*, 
                P.NOME as PRODUTO_NOME,
                U.NOME as USUARIO_NOME
            FROM MOVIMENTACOES_ESTOQUE M
            JOIN PRODUTOS P ON M.ID_PRODUTO = P.ID_PRODUTO
            LEFT JOIN USUARIOS U ON M.ID_USUARIO = U.ID_USUARIO
            ORDER BY M.DATA_MOV DESC
        `;
        const result = await db.query(query);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/movimentacoes:
 *   post:
 *     summary: Create Movement
 *     description: Adds a new stock movement and updates the product balance.
 */
app.post('/api/movimentacoes', async (req, res) => {
    const { ID_PRODUTO, TIPO, QUANTIDADE, MOTIVO, ID_USUARIO } = req.body;

    if (!['E', 'S'].includes(TIPO)) {
        return res.status(400).json({ error: 'Tipo de movimentação inválido (E ou S).' });
    }

    try {
        // 1. Insert Movement
        const movQuery = `
            INSERT INTO MOVIMENTACOES_ESTOQUE (ID_PRODUTO, TIPO, QUANTIDADE, MOTIVO, ID_USUARIO)
            VALUES (?, ?, ?, ?, ?)
            RETURNING ID_MOVIMENTACAO
        `;
        const movResult = await db.query(movQuery, [ID_PRODUTO, TIPO, QUANTIDADE, MOTIVO, ID_USUARIO]);

        // 2. Update Product Balance
        const factor = TIPO === 'E' ? 1 : -1;
        const balanceQuery = `
            UPDATE PRODUTOS 
            SET SALDO_ATUAL = SALDO_ATUAL + (?)
            WHERE ID_PRODUTO = ?
        `;
        await db.query(balanceQuery, [QUANTIDADE * factor, ID_PRODUTO]);

        res.json({ success: true, id: movResult.ID_MOVIMENTACAO });
    } catch (error) {
        console.error('Erro na movimentação de estoque:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- FORNECEDORES API ---

app.get('/api/fornecedores', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM FORNECEDORES WHERE ATIVO = \'S\' ORDER BY RAZAO_SOCIAL');
        res.json(result);
    } catch (error) {
        console.error('Error in GET /api/fornecedores:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/fornecedores', async (req, res) => {
    const { RAZAO_SOCIAL, CNPJ, IE, IM, NOME_FANTASIA, ENDERECO, NUMERO, BAIRRO, CIDADE, UF, CEP } = req.body;
    try {
        const query = `
            INSERT INTO FORNECEDORES (RAZAO_SOCIAL, CNPJ, IE, IM, NOME_FANTASIA, ENDERECO, NUMERO, BAIRRO, CIDADE, UF, CEP, ATIVO)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'S')
            RETURNING ID_FORNECEDOR
        `;
        const result = await db.query(query, [
            sanitize(RAZAO_SOCIAL), cleanDigits(CNPJ), sanitize(IE), sanitize(IM),
            sanitize(NOME_FANTASIA), sanitize(ENDERECO), sanitize(NUMERO),
            sanitize(BAIRRO), sanitize(CIDADE), sanitize(UF), cleanDigits(CEP)
        ]);
        res.json({ success: true, id: result.ID_FORNECEDOR });
    } catch (error) {
        console.error('Error in POST /api/fornecedores:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/fornecedores/:id', async (req, res) => {
    const { id } = req.params;
    const { RAZAO_SOCIAL, CNPJ, IE, IM, NOME_FANTASIA, ENDERECO, NUMERO, BAIRRO, CIDADE, UF, CEP, ATIVO } = req.body;
    try {
        const query = `
            UPDATE FORNECEDORES 
            SET RAZAO_SOCIAL = ?, CNPJ = ?, IE = ?, IM = ?, NOME_FANTASIA = ?, 
                ENDERECO = ?, NUMERO = ?, BAIRRO = ?, CIDADE = ?, UF = ?, CEP = ?, ATIVO = ?
            WHERE ID_FORNECEDOR = ?
        `;
        await db.query(query, [
            sanitize(RAZAO_SOCIAL), cleanDigits(CNPJ), sanitize(IE), sanitize(IM),
            sanitize(NOME_FANTASIA), sanitize(ENDERECO), sanitize(NUMERO),
            sanitize(BAIRRO), sanitize(CIDADE), sanitize(UF), cleanDigits(CEP), ATIVO || 'S', id
        ]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/fornecedores/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE FORNECEDORES SET ATIVO = \'N\' WHERE ID_FORNECEDOR = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- CONTATOS FORNECEDOR API ---

app.get('/api/fornecedores/:id/contatos', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM CONTATOS_FORNECEDOR WHERE ID_FORNECEDOR = ? ORDER BY NOME', [id]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/contatos-fornecedor', async (req, res) => {
    const { ID_FORNECEDOR, NOME, EMAIL, CELULAR } = req.body;
    try {
        const query = `
            INSERT INTO CONTATOS_FORNECEDOR (ID_FORNECEDOR, NOME, EMAIL, CELULAR)
            VALUES (?, ?, ?, ?)
            RETURNING ID_CONTATO
        `;
        const result = await db.query(query, [ID_FORNECEDOR, sanitize(NOME), sanitize(EMAIL), cleanDigits(CELULAR)]);
        res.json({ success: true, id: result.ID_CONTATO });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/contatos-fornecedor/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM CONTATOS_FORNECEDOR WHERE ID_CONTATO = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- STATUS CHAMADO API ---
app.get('/api/status-chamado', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM STATUS_CHAMADO ORDER BY ID_STATUS_CHAMADO');
        res.json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- CHAMADOS API ---

/**
 * @openapi
 * /api/chamados/dashboard:
 *   get:
 *     summary: Get metrics for tickets dashboard
 */
app.get('/api/chamados/dashboard', async (req, res) => {
    try {
        const queries = {
            totalAbertos: `SELECT COUNT(*) as QTD FROM CHAMADOS C JOIN STATUS_CHAMADO S ON C.ID_STATUS_CHAMADO = S.ID_STATUS_CHAMADO WHERE TRIM(S.ENCERRA) = 'N'`,
            totalEncerrados: `SELECT COUNT(*) as QTD FROM CHAMADOS C JOIN STATUS_CHAMADO S ON C.ID_STATUS_CHAMADO = S.ID_STATUS_CHAMADO WHERE TRIM(S.ENCERRA) = 'S'`,
            porUrgencia: `SELECT URGENCIA, COUNT(*) as QTD FROM CHAMADOS GROUP BY URGENCIA`,
            atrasadosSLA: `SELECT COUNT(*) as QTD FROM CHAMADOS WHERE DATA_PRAZO_SLA < CURRENT_TIMESTAMP AND ID_STATUS_CHAMADO NOT IN (SELECT ID_STATUS_CHAMADO FROM STATUS_CHAMADO WHERE TRIM(ENCERRA) = 'S')`,
            vencimentoMes: `
                SELECT FIRST 10 C.ID_CONTRATO, CL.NOME_RAZAO as CLIENTE_NOME, C.DESCRICAO, C.DATA_FIM
                FROM CONTRATOS C
                JOIN CLIENTES CL ON C.ID_CLIENTE = CL.ID_CLIENTE
                WHERE C.DATA_FIM >= CURRENT_DATE 
                AND C.DATA_FIM <= CAST(DATEADD(30 DAY TO CURRENT_DATE) AS DATE)
                ORDER BY C.DATA_FIM ASC
            `,
            porSLA: `
                SELECT SLA.SLDESC as SLA_NOME, COUNT(*) as QTD
                FROM CONTRATOS C
                JOIN SLA ON C.SLAID = SLA.ID_SLA
                GROUP BY SLA.SLDESC
            `
        };

        const [abertosRes, encerradosRes, urgenciaRes, atrasadosRes, vencimentoRes, slaRes] = await Promise.all([
            db.query(queries.totalAbertos),
            db.query(queries.totalEncerrados),
            db.query(queries.porUrgencia),
            db.query(queries.atrasadosSLA),
            db.query(queries.vencimentoMes),
            db.query(queries.porSLA)
        ]);

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
                } else { resolve(blob.toString()); }
            });
        };

        const parsedVencimento = await Promise.all(vencimentoRes.map(async row => ({
            ...row,
            DESCRICAO: await processBlob(row.DESCRICAO)
        })));

        res.json({
            abertos: abertosRes[0].QTD,
            encerrados: encerradosRes[0].QTD,
            porUrgencia: urgenciaRes,
            atrasados: atrasadosRes[0].QTD,
            vencimentoMes: parsedVencimento,
            porSLA: slaRes
        });
    } catch (error) { 
        console.error('Dashboard API Error:', error);
        res.status(500).json({ error: error.message }); 
    }
});

/**
 * @openapi
 * /api/chamados:
 *   get:
 *     summary: List all tickets
 */
app.get('/api/chamados', async (req, res) => {
    try {
        const query = `
            SELECT 
                C.*,
                CL.NOME_RAZAO as CLIENTE_NOME,
                SLA.SLDESC as SLA_DESC,
                S.NOME as STATUS_NOME, S.COR as STATUS_COR, S.ENCERRA as STATUS_ENCERRA,
                CO.NOME_CONTATO as CONTATO_NOME,
                ATV.DESCRICAO as ATIVO_NOME,
                T.NOME as TECNICO_NOME,
                CON.DESCRICAO as CONTRATO_DESC
            FROM CHAMADOS C
            LEFT JOIN CLIENTES CL ON C.CODCLIENTE = CL.ID_CLIENTE
            LEFT JOIN SLA ON C.SLAID = SLA.ID_SLA
            LEFT JOIN STATUS_CHAMADO S ON C.ID_STATUS_CHAMADO = S.ID_STATUS_CHAMADO
            LEFT JOIN CONTATOS CO ON C.ID_CONTATO = CO.ID_CONTATO
            LEFT JOIN ATIVOS ATV ON C.ID_ATIVO = ATV.ID_ATIVO
            LEFT JOIN TECNICOS T ON C.ID_TECNICO = T.ID_TECNICO
            LEFT JOIN CONTRATOS CON ON C.ID_CONTRATO = CON.ID_CONTRATO
            ORDER BY C.DATA_HORA DESC
        `;
        const result = await db.query(query);

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
                } else { resolve(blob.toString()); }
            });
        };

        const parsedResult = await Promise.all(result.map(async row => ({
            ...row,
            DESCRICAO: await processBlob(row.DESCRICAO),
            RESOLUCAO: await processBlob(row.RESOLUCAO),
            CONTRATO_DESC: await processBlob(row.CONTRATO_DESC)
        })));

        res.json(parsedResult);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

/**
 * @openapi
 * /api/chamados:
 *   post:
 *     summary: Create a new ticket
 */
app.post('/api/chamados', async (req, res) => {
    const {
        CODCLIENTE, NUMERO_SERIE, SLAID, DESCRICAO, URGENCIA,
        ID_STATUS_CHAMADO, ID_CONTATO, ID_ATIVO, ID_TECNICO, ID_CONTRATO
    } = req.body;

    try {
        // 1. Geração Automática do TICKETID (TK-AAAA-NNNNN)
        const year = new Date().getFullYear();
        const genRes = await db.query('SELECT GEN_ID(GEN_TICKET_ID, 1) as NID FROM RDB$DATABASE');
        const num = genRes[0].NID.toString().padStart(5, '0');
        const ticketId = `TK-${year}-${num}`;

        // 2. Cálculo de Data Prazo SLA (exemplo: soma horas do SLA se existir)
        let dataPrazoSla = null;
        if (SLAID) {
            const sla = await db.query('SELECT SLDESC FROM SLA WHERE ID_SLA = ?', [SLAID]);
            if (sla.length > 0) {
                const hoursMatch = sla[0].SLDESC.match(/\d+/);
                if (hoursMatch) {
                    const hours = parseInt(hoursMatch[0]);
                    const now = new Date();
                    now.setHours(now.getHours() + hours);
                    dataPrazoSla = now;
                }
            }
        }

        const query = `
            INSERT INTO CHAMADOS (
                TICKETID, CODCLIENTE, NUMERO_SERIE, SLAID, DATA_HORA,
                DESCRICAO, URGENCIA, ID_STATUS_CHAMADO, ID_CONTATO, ID_ATIVO, 
                ID_TECNICO, ID_CONTRATO, DATA_PRAZO_SLA, DATA_MODIFICACAO
            )
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            RETURNING ID_CHAMADO
        `;

        const result = await db.query(query, [
            ticketId, CODCLIENTE || null, NUMERO_SERIE || null, SLAID || null,
            DESCRICAO || null, URGENCIA || 'Média', ID_STATUS_CHAMADO || 1,
            ID_CONTATO || null, ID_ATIVO || null, ID_TECNICO || null,
            ID_CONTRATO || null, dataPrazoSla
        ]);

        // 3. Registrar Histórico Inicial
        await db.query(
            `INSERT INTO HISTORICO_CHAMADOS (ID_CHAMADO, TIPO, DESCRICAO) VALUES (?, ?, ?)`,
            [result.ID_CHAMADO, 'ABERTURA', 'Chamado aberto via sistema.']
        );

        res.json({ success: true, id: result.ID_CHAMADO, ticketId });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/chamados/:id', async (req, res) => {
    const { id } = req.params;
    const {
        CODCLIENTE, NUMERO_SERIE, SLAID, DESCRICAO, URGENCIA,
        ID_STATUS_CHAMADO, ID_CONTATO, ID_ATIVO, ID_TECNICO,
        ID_CONTRATO, RESOLUCAO, DATA_FECHAMENTO
    } = req.body;

    try {
        // Obter estado anterior para histórico
        const old = (await db.query('SELECT ID_STATUS_CHAMADO, ID_TECNICO FROM CHAMADOS WHERE ID_CHAMADO = ?', [id]))[0];

        const query = `
            UPDATE CHAMADOS 
            SET CODCLIENTE = ?, NUMERO_SERIE = ?, SLAID = ?,
                DESCRICAO = ?, URGENCIA = ?, ID_STATUS_CHAMADO = ?,
                ID_CONTATO = ?, ID_ATIVO = ?, ID_TECNICO = ?,
                ID_CONTRATO = ?, RESOLUCAO = ?, DATA_FECHAMENTO = ?,
                DATA_MODIFICACAO = CURRENT_TIMESTAMP
            WHERE ID_CHAMADO = ?
        `;
        await db.query(query, [
            CODCLIENTE || null, NUMERO_SERIE || null, SLAID || null,
            DESCRICAO || null, URGENCIA || null, ID_STATUS_CHAMADO || null,
            ID_CONTATO || null, ID_ATIVO || null, ID_TECNICO || null,
            ID_CONTRATO || null, RESOLUCAO || null, DATA_FECHAMENTO || null,
            id
        ]);

        // Registrar mudanças no histórico
        if (old) {
            if (ID_STATUS_CHAMADO && ID_STATUS_CHAMADO != old.ID_STATUS_CHAMADO) {
                const sName = await db.query('SELECT NOME FROM STATUS_CHAMADO WHERE ID_STATUS_CHAMADO = ?', [ID_STATUS_CHAMADO]);
                await db.query('INSERT INTO HISTORICO_CHAMADOS (ID_CHAMADO, TIPO, DESCRICAO) VALUES (?, ?, ?)',
                    [id, 'STATUS', `Status alterado para: ${sName[0]?.NOME || ID_STATUS_CHAMADO}`]);
            }
            if (ID_TECNICO && ID_TECNICO != old.ID_TECNICO) {
                const tName = await db.query('SELECT NOME FROM TECNICOS WHERE ID_TECNICO = ?', [ID_TECNICO]);
                await db.query('INSERT INTO HISTORICO_CHAMADOS (ID_CHAMADO, TIPO, DESCRICAO) VALUES (?, ?, ?)',
                    [id, 'ATRIBUICAO', `Técnico atribuído: ${tName[0]?.NOME || ID_TECNICO}`]);
            }
        }

        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/chamados/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM HISTORICO_CHAMADOS WHERE ID_CHAMADO = ?', [req.params.id]);
        await db.query('DELETE FROM CHAMADOS WHERE ID_CHAMADO = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- HISTÓRICO DE CHAMADOS API ---
app.get('/api/chamados/:id/historico', async (req, res) => {
    try {
        const query = `
            SELECT H.*, U.NOME as USUARIO_NOME, T.NOME as TECNICO_NOME
            FROM HISTORICO_CHAMADOS H
            LEFT JOIN USUARIOS U ON H.ID_USUARIO = U.ID_USUARIO
            LEFT JOIN TECNICOS T ON H.ID_TECNICO = T.ID_TECNICO
            WHERE H.ID_CHAMADO = ?
            ORDER BY H.DATA_HORA DESC
        `;
        const result = await db.query(query, [req.params.id]);

        const parsed = await Promise.all(result.map(async r => ({
            ...r,
            DESCRICAO: r.DESCRICAO ? (Buffer.isBuffer(r.DESCRICAO) ? r.DESCRICAO.toString() : r.DESCRICAO) : ''
        })));

        res.json(parsed);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/chamados/:id/historico', async (req, res) => {
    const { TIPO, DESCRICAO, ID_USUARIO, ID_TECNICO } = req.body;
    try {
        await db.query(
            `INSERT INTO HISTORICO_CHAMADOS (ID_CHAMADO, TIPO, DESCRICAO, ID_USUARIO, ID_TECNICO) VALUES (?, ?, ?, ?, ?)`,
            [req.params.id, TIPO || 'COMENTARIO', DESCRICAO, ID_USUARIO || null, ID_TECNICO || null]
        );
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- HISTÓRICO DE EQUIPAMENTO (POR SERIAL) ---
app.get('/api/ativos/historico/:serial', async (req, res) => {
    try {
        const query = `
            SELECT 
                C.TICKETID, C.DATA_HORA, C.DATA_FECHAMENTO, 
                S.NOME as STATUS_NOME, T.NOME as TECNICO_NOME,
                C.DESCRICAO, C.RESOLUCAO
            FROM CHAMADOS C
            LEFT JOIN STATUS_CHAMADO S ON C.ID_STATUS_CHAMADO = S.ID_STATUS_CHAMADO
            LEFT JOIN TECNICOS T ON C.ID_TECNICO = T.ID_TECNICO
            WHERE C.NUMERO_SERIE = ? OR C.ID_ATIVO = (SELECT ID_ATIVO FROM ATIVOS WHERE NUMERO_SERIE = ? ROWS 1)
            ORDER BY C.DATA_HORA DESC
        `;
        const result = await db.query(query, [req.params.serial, req.params.serial]);
        res.json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
});


// Helper functions for data sanitization
function sanitize(val) {
    if (val === undefined || val === null) return null;
    if (typeof val === 'string') return val.trim().toUpperCase();
    return val;
}

function cleanDigits(val) {
    if (val === undefined || val === null) return null;
    return val.toString().replace(/\D/g, '');
}

// Debug route to pinpoint DB issues
app.get('/api/debug-db', async (req, res) => {
    try {
        const query = req.query.q || 'SELECT FIRST 5 * FROM FORNECEDORES';
        console.log('DEBUG DB Query:', query);
        const result = await db.query(query);
        res.json({ success: true, count: result.length, data: result });
    } catch (e) {
        console.error('DEBUG DB Error:', e);
        res.status(500).json({ success: false, error: e.message, stack: e.stack });
    }
});

// Global Error Handlers
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start Server
app.listen(port, '0.0.0.0', async () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
    try {
        await db.testConnection();
    } catch (err) {
        console.error('Failed to connect to DB at startup:', err);
    }
});
