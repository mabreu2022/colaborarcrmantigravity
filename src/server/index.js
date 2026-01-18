const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();
const fs = require('fs'); // Added for .env writing

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
app.get('/api/health', async (req, res) => {
    try {
        await db.testConnection();
        res.json({ status: 'ok', message: 'Connected to Database' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

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

app.get('/api/clientes/:id/contatos', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM CONTATOS WHERE ID_CLIENTE = ? ORDER BY NOME_CONTATO', [id]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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
                C.DESCRICAO,
                C.OBSERVACOES
            FROM CONTRATOS C
            LEFT JOIN CLIENTES CL ON C.ID_CLIENTE = CL.ID_CLIENTE
            LEFT JOIN STATUS_CONTRATO S ON C.ID_STATUS = S.ID_STATUS
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

app.post('/api/contratos', async (req, res) => {
    const { ID_CLIENTE, DATA_INICIO, DATA_FIM, VALOR_MENSAL, ID_STATUS, DESCRICAO, OBSERVACOES } = req.body;
    console.log("POST /api/contratos Payload:", req.body); // Debug Log
    try {
        const query = `
            INSERT INTO CONTRATOS (ID_CLIENTE, DATA_INICIO, DATA_FIM, VALOR_MENSAL, ID_STATUS, DESCRICAO, OBSERVACOES)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING ID_CONTRATO
        `;
        const result = await db.query(query, [ID_CLIENTE, DATA_INICIO, DATA_FIM, VALOR_MENSAL, ID_STATUS, DESCRICAO, OBSERVACOES]);
        console.log("Insert Result:", result); // Debug Log
        res.json({ success: true, id: result.ID_CONTRATO });
    } catch (error) {
        console.error("POST Contract Error:", error); // Debug Log
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/contratos/:id', async (req, res) => {
    const { id } = req.params;
    const { ID_CLIENTE, DATA_INICIO, DATA_FIM, VALOR_MENSAL, ID_STATUS, DESCRICAO, OBSERVACOES } = req.body;
    try {
        const query = `
            UPDATE CONTRATOS 
            SET ID_CLIENTE = ?, DATA_INICIO = ?, DATA_FIM = ?, VALOR_MENSAL = ?, ID_STATUS = ?, DESCRICAO = ?, OBSERVACOES = ?
            WHERE ID_CONTRATO = ?
        `;
        await db.query(query, [ID_CLIENTE, DATA_INICIO, DATA_FIM, VALOR_MENSAL, ID_STATUS, DESCRICAO, OBSERVACOES, id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/contratos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM CONTRATOS WHERE ID_CONTRATO = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/status', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM "STATUS"');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ... Assets ...

app.get('/api/ativos', async (req, res) => {
    try {
        const query = `
            SELECT 
                A.ID_ATIVO,
                A.DESCRICAO,
                A.NUMERO_SERIE,
                A.ID_STATUS,
                S.STATUS as STATUS_NOME,
                A.ID_CLIENTE_PROPRIETARIO,
                C.NOME_RAZAO as PROPRIETARIO
            FROM ATIVOS A
            LEFT JOIN CLIENTES C ON A.ID_CLIENTE_PROPRIETARIO = C.ID_CLIENTE
            LEFT JOIN "STATUS" S ON A.ID_STATUS = S.ID_STATUS
        `;
        const result = await db.query(query);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ativos', async (req, res) => {
    const { DESCRICAO, NUMERO_SERIE, ID_STATUS, ID_CLIENTE_PROPRIETARIO } = req.body;
    try {
        const query = `
            INSERT INTO ATIVOS (DESCRICAO, NUMERO_SERIE, ID_STATUS, ID_CLIENTE_PROPRIETARIO)
            VALUES (?, ?, ?, ?)
            RETURNING ID_ATIVO
        `;
        const result = await db.query(query, [DESCRICAO, NUMERO_SERIE, ID_STATUS, ID_CLIENTE_PROPRIETARIO]);
        res.json({ success: true, id: result.ID_ATIVO });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/ativos/:id', async (req, res) => {
    const { id } = req.params;
    const { DESCRICAO, NUMERO_SERIE, ID_STATUS, ID_CLIENTE_PROPRIETARIO } = req.body;
    try {
        const query = `UPDATE ATIVOS SET DESCRICAO=?, NUMERO_SERIE=?, ID_STATUS=?, ID_CLIENTE_PROPRIETARIO=? WHERE ID_ATIVO=?`;
        await db.query(query, [DESCRICAO, NUMERO_SERIE, ID_STATUS, ID_CLIENTE_PROPRIETARIO, id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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
        const query = `SELECT * FROM USUARIOS WHERE EMAIL = ? AND SENHA = ?`;
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
            SELECT C.ID_CONTRATO, C.DESCRICAO, S.NOME as STATUS
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
            // User requested: Assets belonging to this contract
            // Assuming ATIVOS_CONTRATOS links valid assets for the contract
            // We join to ensure the asset is in the contract list.
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

        // If returned (Data Devolucao Set), free the asset?
        if (DATA_DEVOLUCAO && ID_ATIVO) {
            await db.query('UPDATE ATIVOS SET ID_STATUS = 2 WHERE ID_ATIVO = ?', [ID_ATIVO]);
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

app.delete('/api/tecnicos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM TECNICOS WHERE ID_TECNICO=?', [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/especialidades', async (req, res) => {
    try { res.json(await db.query('SELECT * FROM ESPECIALIDADES')); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/especialidades', async (req, res) => {
    const { NOME } = req.body;
    try {
        const result = await db.query('INSERT INTO ESPECIALIDADES (NOME) VALUES (?) RETURNING ID_ESPECIALIDADE', [NOME]);
        res.json({ success: true, id: result.ID_ESPECIALIDADE });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/especialidades/:id', async (req, res) => {
    const { id } = req.params;
    const { NOME } = req.body;
    try {
        await db.query('UPDATE ESPECIALIDADES SET NOME=? WHERE ID_ESPECIALIDADE=?', [NOME, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/especialidades/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM ESPECIALIDADES WHERE ID_ESPECIALIDADE=?', [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/agendamentos/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM AGENDA WHERE ID_AGENDA = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// Start Server
app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}`);
    try {
        await db.testConnection();
    } catch (err) {
        console.error('Failed to connect to DB at startup:', err);
    }
});
