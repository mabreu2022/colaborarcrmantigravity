const db = require('./src/server/db');

async function checkIntegrity() {
    try {
        console.log("--- Checking for Orphaned Records ---");

        const queries = [
            { name: "CONTATOS (no client)", sql: "SELECT COUNT(*) as CNT FROM CONTATOS C LEFT JOIN CLIENTES CL ON C.ID_CLIENTE = CL.ID_CLIENTE WHERE CL.ID_CLIENTE IS NULL AND C.ID_CLIENTE IS NOT NULL" },
            { name: "CONTRATOS (no client)", sql: "SELECT COUNT(*) as CNT FROM CONTRATOS C LEFT JOIN CLIENTES CL ON C.ID_CLIENTE = CL.ID_CLIENTE WHERE CL.ID_CLIENTE IS NULL AND C.ID_CLIENTE IS NOT NULL" },
            { name: "ATIVOS (no client)", sql: "SELECT COUNT(*) as CNT FROM ATIVOS A LEFT JOIN CLIENTES CL ON A.ID_CLIENTE_PROPRIETARIO = CL.ID_CLIENTE WHERE CL.ID_CLIENTE IS NULL AND A.ID_CLIENTE_PROPRIETARIO IS NOT NULL" },
            { name: "ATIVOS_CONTRATOS (no contract)", sql: "SELECT COUNT(*) as CNT FROM ATIVOS_CONTRATOS AC LEFT JOIN CONTRATOS C ON AC.ID_CONTRATO = C.ID_CONTRATO WHERE C.ID_CONTRATO IS NULL AND AC.ID_CONTRATO IS NOT NULL" },
            { name: "ATIVOS_CONTRATOS (no asset)", sql: "SELECT COUNT(*) as CNT FROM ATIVOS_CONTRATOS AC LEFT JOIN ATIVOS A ON AC.ID_ATIVO = A.ID_ATIVO WHERE A.ID_ATIVO IS NULL AND AC.ID_ATIVO IS NOT NULL" },
            { name: "CHAMADOS (no client)", sql: "SELECT COUNT(*) as CNT FROM CHAMADOS CH LEFT JOIN CLIENTES CL ON CH.ID_CLIENTE = CL.ID_CLIENTE WHERE CL.ID_CLIENTE IS NULL AND CH.ID_CLIENTE IS NOT NULL" },
            { name: "CHAMADOS (no contact)", sql: "SELECT COUNT(*) as CNT FROM CHAMADOS CH LEFT JOIN CONTATOS C ON CH.ID_CONTATO = C.ID_CONTATO WHERE C.ID_CONTATO IS NULL AND CH.ID_CONTATO IS NOT NULL" },
            { name: "CHAMADOS (no contract)", sql: "SELECT COUNT(*) as CNT FROM CHAMADOS CH LEFT JOIN CONTRATOS C ON CH.ID_CONTRATO = C.ID_CONTRATO WHERE C.ID_CONTRATO IS NULL AND CH.ID_CONTRATO IS NOT NULL" },
            { name: "CHAMADOS (no asset)", sql: "SELECT COUNT(*) as CNT FROM CHAMADOS CH LEFT JOIN ATIVOS A ON CH.ID_ATIVO = A.ID_ATIVO WHERE A.ID_ATIVO IS NULL AND CH.ID_ATIVO IS NOT NULL" }
        ];

        for (const q of queries) {
            const res = await db.query(q.sql);
            console.log(`${q.name}: ${res[0].CNT}`);
        }

        console.log("\n--- Checking for Duplicate Contacts (Same Email) ---");
        const dupContacts = await db.query(`
            SELECT EMAIL_CONTATO, COUNT(*) as CNT 
            FROM CONTATOS 
            WHERE EMAIL_CONTATO IS NOT NULL AND ATIVO = 'S'
            GROUP BY EMAIL_CONTATO 
            HAVING COUNT(*) > 1
        `);
        console.table(dupContacts);

        if (dupContacts.length > 0) {
            console.log("Analyzing duplicates:");
            for (const dup of dupContacts) {
                const details = await db.query(`SELECT ID_CONTATO, ID_CLIENTE, NOME_CONTATO FROM CONTATOS WHERE EMAIL_CONTATO = ? AND ATIVO = 'S'`, [dup.EMAIL_CONTATO]);
                console.log(`Email: ${dup.EMAIL_CONTATO}`);
                console.table(details);
            }
        }

    } catch (error) {
        console.error("Error during integrity check:", error);
    } finally {
        process.exit(0);
    }
}

checkIntegrity();
