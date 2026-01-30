# Integração Clawdbot - ColaborarCRM

Integração completa do ColaborarCRM com o Clawdbot (AI Assistant).

## 📁 Estrutura

```
clawdbot-integration/
├── colaborarcrm.skill        # Skill empacotada (instalar no Clawdbot)
├── SKILL.md                  # Documentação principal
├── README.md                 # Este arquivo
├── scripts/
│   └── colaborarcrm_client.py  # Cliente Python completo
└── references/
    └── api-reference.md      # Referência da API
```

## 🚀 Como Instalar

### 1. Instalar a Skill no Clawdbot

A skill já está instalada automaticamente no Clawdbot! 

Para instalar em outro sistema:
```bash
clawdbot skills install colaborarcrm.skill
```

### 2. Usar via Python

```python
from scripts.colaborarcrm_client import ColaborarCRMClient

# Criar cliente
client = ColaborarCRMClient(base_url="http://179.0.178.186:3011")

# Health check
health = client.health_check()
print(health)  # {"status": "ok", "message": "Connected to Database"}

# Listar clientes
clientes = client.list_clientes()
print(f"Total de clientes: {len(clientes)}")

# Criar novo cliente
novo_cliente = client.create_cliente({
    "NOME_RAZAO": "Empresa XYZ Ltda",
    "NOME_FANTASIA": "XYZ",
    "CPF_CNPJ": "12345678000190",
    "EMAIL": "contato@xyz.com",
    "TELEFONE": "11999999999",
    "TIPO_PESSOA": "J",  # J=Jurídica, F=Física
    "ATIVO": "S"
})
```

### 3. Usar via CLI

```bash
# Health check
python scripts/colaborarcrm_client.py health

# Listar clientes
python scripts/colaborarcrm_client.py clientes

# Listar contratos
python scripts/colaborarcrm_client.py contratos

# Listar ativos
python scripts/colaborarcrm_client.py ativos

# Criar cliente
python scripts/colaborarcrm_client.py clientes --action create \
  --data '{"NOME_RAZAO":"Teste Ltda","CPF_CNPJ":"123","TIPO_PESSOA":"J","ATIVO":"S"}'

# Atualizar cliente
python scripts/colaborarcrm_client.py clientes --action update \
  --id 42 --data '{"EMAIL":"novo@email.com"}'

# Deletar cliente
python scripts/colaborarcrm_client.py clientes --action delete --id 999
```

## 🎯 Funcionalidades

### Gestão de Clientes
- ✅ Listar clientes (primeiros 50, ordenados por nome)
- ✅ Criar novos clientes (PF ou PJ)
- ✅ Atualizar dados de clientes
- ✅ Deletar clientes

### Gestão de Contatos
- ✅ Listar todos os contatos
- ✅ Criar contatos vinculados a clientes
- ✅ Atualizar informações de contatos
- ✅ Deletar contatos

### Gestão de Contratos
- ✅ Listar contratos com detalhes de cliente e status
- ✅ Criar novos contratos
- ✅ Atualizar contratos existentes
- ✅ Deletar contratos

### Gestão de Ativos
- ✅ Listar ativos com proprietário e status
- ✅ Registrar novos ativos
- ✅ Atualizar informações de ativos
- ✅ Deletar ativos

### Gestão de Pagamentos
- ✅ Listar todos os pagamentos
- ✅ Registrar novos pagamentos
- ✅ Atualizar status de pagamentos
- ✅ Deletar pagamentos

### Gestão de Técnicos
- ✅ Listar técnicos com especialidades
- ✅ Cadastrar novos técnicos
- ✅ Atualizar dados de técnicos
- ✅ Deletar técnicos

### Outros Recursos
- ✅ Auditoria (logs de ações)
- ✅ Permissões de acesso
- ✅ Especialidades técnicas
- ✅ Status de ativos

## 🤖 Usando com Clawdbot

Depois de instalar a skill, você pode conversar naturalmente:

**Exemplos de comandos:**
- "Mostre os clientes do CRM"
- "Crie um novo cliente chamado ABC Tecnologia"
- "Quais contratos estão ativos?"
- "Registre um pagamento do contrato #5"
- "Liste os técnicos disponíveis"
- "Quais ativos pertencem ao cliente Conect Solutions?"
- "Adicione um contato para o cliente #42"

## 📚 Documentação

- **SKILL.md** - Guia completo de uso e workflows
- **references/api-reference.md** - Referência completa da API REST

## 🔧 Configuração

### Servidor API
- **Base URL:** http://179.0.178.186:3011
- **Autenticação:** Não requerida (API aberta)
- **Porta:** 3011

### Dependências Python
```bash
pip install requests
```

## 💡 Dicas

### Tipos de Pessoa
- **F** = Pessoa Física (CPF)
- **J** = Pessoa Jurídica (CNPJ)

### Status
- **S** = Sim (Ativo)
- **N** = Não (Inativo)

### Status de Pagamento
- **pendente** - Aguardando pagamento
- **pago** - Pagamento realizado
- **atrasado** - Vencimento ultrapassado

### Formato de Datas
Use o formato: `YYYY-MM-DD` (ex: `2024-01-15`)

## 📊 Dados de Teste

O sistema já contém dados de teste:
- **11 clientes** cadastrados (Cliente 1 a Cliente 11)
- **Conect Solutions** (ID: 42) - empresa real cadastrada
- CPF/CNPJs de teste começando em 000.000.000-01

## 🆘 Troubleshooting

**Servidor não responde?**
→ Verifique se a VPS está online: http://179.0.178.186:3011/api/health

**Erro 404?**
→ Verifique se o ID do recurso existe

**Erro 500?**
→ Erro no servidor/banco de dados - tente novamente mais tarde

## 📄 Licença

Integração desenvolvida para uso interno da Conect Solutions.

---

**Desenvolvido por:** Clawdbot (AI Assistant)  
**Data:** 28/01/2026  
**Status:** ✅ Testado e funcionando
