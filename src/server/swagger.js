const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Colaborar CRM API',
            version: '1.0.0',
            description: 'API documentation for Colaborar CRM. Integrates with Clawdbot.',
            contact: {
                name: 'Developer',
            },
        },
        servers: [
            {
                url: 'http://179.0.178.186:3011',
                description: 'VPS Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Cliente: {
                    type: 'object',
                    properties: {
                        ID_CLIENTE: { type: 'integer' },
                        NOME_RAZAO: { type: 'string' },
                        NOME_FANTASIA: { type: 'string' },
                        CPF_CNPJ: { type: 'string' },
                        IE: { type: 'string' },
                        EMAIL: { type: 'string' },
                        TELEFONE: { type: 'string' },
                        ENDERECO: { type: 'string' },
                        NUMERO: { type: 'string' },
                        COMPLEMENTO: { type: 'string' },
                        BAIRRO: { type: 'string' },
                        CEP: { type: 'string' },
                        MUNICIPIO: { type: 'string' },
                        UF: { type: 'string' },
                        TIPO_PESSOA: { type: 'string', enum: ['F', 'J'] },
                        CODIGO_PAIS: { type: 'integer' },
                        ATIVO: { type: 'string', enum: ['S', 'N'] }
                    }
                },
                Contato: {
                    type: 'object',
                    properties: {
                        ID_CONTATO: { type: 'integer' },
                        ID_CLIENTE: { type: 'integer' },
                        NOME_CONTATO: { type: 'string' },
                        TELEFONE_CONTATO: { type: 'string' },
                        EMAIL_CONTATO: { type: 'string' },
                        CARGO: { type: 'string' },
                        OBSERVACAO: { type: 'string' },
                        TIPO_CONTATO: { type: 'string' }
                    }
                },
                Contrato: {
                    type: 'object',
                    properties: {
                        ID_CONTRATO: { type: 'integer' },
                        ID_CLIENTE: { type: 'integer' },
                        NOME_RAZAO: { type: 'string' },
                        DATA_INICIO: { type: 'string', format: 'date' },
                        DATA_FIM: { type: 'string', format: 'date' },
                        VALOR_MENSAL: { type: 'number' },
                        ID_STATUS: { type: 'integer' },
                        STATUS_NOME: { type: 'string' },
                        DESCRICAO: { type: 'string' },
                        OBSERVACOES: { type: 'string' }
                    }
                },
                Pagamento: {
                    type: 'object',
                    properties: {
                        ID_PAGAMENTO: { type: 'integer' },
                        ID_CONTRATO: { type: 'integer' },
                        DATA_VENCIMENTO: { type: 'string', format: 'date' },
                        DATA_PAGAMENTO: { type: 'string', format: 'date' },
                        VALOR_PAGO: { type: 'number' },
                        STATUS_PAGAMENTO: { type: 'string', enum: ['pendente', 'pago', 'atrasado'] }
                    }
                },
                Auditoria: {
                    type: 'object',
                    properties: {
                        ID_LOG: { type: 'integer' },
                        ID_USUARIO: { type: 'integer' },
                        ID_ACAO: { type: 'integer' },
                        ENTIDADE: { type: 'string' },
                        ID_ENTIDADE: { type: 'integer' },
                        DATA_HORA: { type: 'string', format: 'date-time' }
                    }
                },
                Permissao: {
                    type: 'object',
                    properties: {
                        ID_PERFIL: { type: 'integer' },
                        NOME_TELA: { type: 'string' },
                        PODE_ACESSAR: { type: 'boolean' }
                    }
                },
                Acao: {
                    type: 'object',
                    properties: {
                        ID_ACAO: { type: 'integer' },
                        NOME: { type: 'string' },
                        DESCRICAO: { type: 'string' }
                    }
                },
                Tecnico: {
                    type: 'object',
                    properties: {
                        ID_TECNICO: { type: 'integer' },
                        NOME: { type: 'string' },
                        CPF: { type: 'string' },
                        EMAIL: { type: 'string' },
                        TELEFONE: { type: 'string' },
                        ESPECIALIDADES: { type: 'string' },
                        ESPECIALIDADES_IDS: { type: 'string' }
                    }
                },
                Especialidade: {
                    type: 'object',
                    properties: {
                        ID_ESPECIALIDADE: { type: 'integer' },
                        NOME: { type: 'string' }
                    }
                },
                Ativo: {
                    type: 'object',
                    properties: {
                        ID_ATIVO: { type: 'integer' },
                        DESCRICAO: { type: 'string' },
                        NUMERO_SERIE: { type: 'string' },
                        ID_STATUS: { type: 'integer' },
                        STATUS_NOME: { type: 'string' },
                        ID_CLIENTE_PROPRIETARIO: { type: 'integer' },
                        PROPRIETARIO: { type: 'string' }
                    }
                },
                Status: {
                    type: 'object',
                    properties: {
                        ID_STATUS: { type: 'integer' },
                        STATUS: { type: 'string' }
                    }
                }
            }
        }
    },
    apis: ['./index.js'], // Files containing annotations
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
