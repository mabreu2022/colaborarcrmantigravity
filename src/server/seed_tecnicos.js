
const db = require('./db');

async function seedTechnicians() {
    try {
        console.log('Inserting Specialities...');
        // Check if exists first to avoid duplicates or triggers incrementing indefinitely (though okay for dev)
        // Simple insert
        const spec1 = await db.query("INSERT INTO ESPECIALIDADES (NOME) VALUES ('Manutenção Geral') RETURNING ID_ESPECIALIDADE");
        const spec2 = await db.query("INSERT INTO ESPECIALIDADES (NOME) VALUES ('Redes') RETURNING ID_ESPECIALIDADE");

        const idSpec1 = spec1.ID_ESPECIALIDADE;
        const idSpec2 = spec2.ID_ESPECIALIDADE;
        console.log('Specialties inserted:', idSpec1, idSpec2);

        console.log('Inserting Technicians...');
        const tech1 = await db.query("INSERT INTO TECNICOS (NOME, CPF, EMAIL, TELEFONE) VALUES ('João Silva', '12345678900', 'joao@email.com', '11999999999') RETURNING ID_TECNICO");
        const tech2 = await db.query("INSERT INTO TECNICOS (NOME, CPF, EMAIL, TELEFONE) VALUES ('Maria Souza', '98765432100', 'maria@email.com', '11888888888') RETURNING ID_TECNICO");

        const idTech1 = tech1.ID_TECNICO;
        const idTech2 = tech2.ID_TECNICO;
        console.log('Technicians inserted:', idTech1, idTech2);

        console.log('Linking...');
        await db.query("INSERT INTO TECNICO_ESPECIALIDADES (ID_TECNICO, ID_ESPECIALIDADE) VALUES (?, ?)", [idTech1, idSpec1]);
        await db.query("INSERT INTO TECNICO_ESPECIALIDADES (ID_TECNICO, ID_ESPECIALIDADE) VALUES (?, ?)", [idTech2, idSpec2]);
        await db.query("INSERT INTO TECNICO_ESPECIALIDADES (ID_TECNICO, ID_ESPECIALIDADE) VALUES (?, ?)", [idTech1, idSpec2]);

        console.log('Seed completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Seed errors:', error);
        process.exit(1);
    }
}

seedTechnicians();
