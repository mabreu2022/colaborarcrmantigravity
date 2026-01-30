---
name: colaborarcrm
description: Manage clients, contracts, contacts, assets, technicians, and payments in ColaborarCRM. Use when the user needs to query, create, update, or delete CRM data including clients (clientes), contracts (contratos), contacts (contatos), assets (ativos), payments (pagamentos), or technicians (técnicos).
---

# ColaborarCRM Integration

Interact with Colaborar CRM - complete CRM system for managing clients, contracts, contacts, assets, and technicians.

## Quick Start

### Basic Usage

```python
from scripts.colaborarcrm_client import ColaborarCRMClient

client = ColaborarCRMClient(base_url="http://179.0.178.186:3011")

# List clients
clientes = client.list_clientes()

# Create new client
novo_cliente = client.create_cliente({
    "NOME_RAZAO": "Empresa ABC Ltda",
    "NOME_FANTASIA": "ABC",
    "CPF_CNPJ": "12345678000190",
    "EMAIL": "contato@abc.com",
    "TELEFONE": "11999999999",
    "TIPO_PESSOA": "J",
    "ATIVO": "S"
})
```

## Common Operations

### Client Management

**List clients:**
```python
clientes = client.list_clientes()  # First 50 ordered by name
```

**Create client:**
```python
client.create_cliente({
    "NOME_RAZAO": "João Silva",
    "CPF_CNPJ": "12345678900",
    "EMAIL": "joao@email.com",
    "TIPO_PESSOA": "F",  # F=Física, J=Jurídica
    "ATIVO": "S"
})
```

**Update client:**
```python
client.update_cliente(id_cliente=5, cliente={
    "EMAIL": "novo@email.com",
    "TELEFONE": "11988887777"
})
```

### Contract Management

**List contracts:**
```python
contratos = client.list_contratos()
```

**Create contract:**
```python
client.create_contrato({
    "ID_CLIENTE": 5,
    "DATA_INICIO": "2024-01-01",
    "DATA_FIM": "2024-12-31",
    "VALOR_MENSAL": 5000.00,
    "ID_STATUS": 1,
    "DESCRICAO": "Contrato de manutenção"
})
```

### Contact Management

**Add contact to client:**
```python
client.create_contato({
    "ID_CLIENTE": 5,
    "NOME_CONTATO": "Maria Santos",
    "TELEFONE_CONTATO": "11988887777",
    "EMAIL_CONTATO": "maria@empresa.com",
    "CARGO": "Gerente de TI"
})
```

### Asset Management

**List assets:**
```python
ativos = client.list_ativos()
```

**Register new asset:**
```python
client.create_ativo({
    "DESCRICAO": "Notebook Dell Inspiron",
    "NUMERO_SERIE": "SN123456",
    "ID_STATUS": 1,
    "ID_CLIENTE_PROPRIETARIO": 5
})
```

### Payment Tracking

**List payments:**
```python
pagamentos = client.list_pagamentos()
```

**Record payment:**
```python
client.create_pagamento({
    "ID_CONTRATO": 5,
    "DATA_VENCIMENTO": "2024-02-15",
    "DATA_PAGAMENTO": "2024-02-10",
    "VALOR_PAGO": 5000.00,
    "STATUS_PAGAMENTO": "pago"  # pendente, pago, atrasado
})
```

## CLI Usage

The client script can be run directly:

```bash
# Health check
python scripts/colaborarcrm_client.py health

# List clients
python scripts/colaborarcrm_client.py clientes

# List contracts
python scripts/colaborarcrm_client.py contratos

# Create client
python scripts/colaborarcrm_client.py clientes --action create \
  --data '{"NOME_RAZAO":"Test","CPF_CNPJ":"123","TIPO_PESSOA":"F","ATIVO":"S"}'

# Update client
python scripts/colaborarcrm_client.py clientes --action update \
  --id 5 --data '{"EMAIL":"new@email.com"}'

# Delete client
python scripts/colaborarcrm_client.py clientes --action delete --id 5
```

## API Reference

For complete endpoint documentation, see [api-reference.md](references/api-reference.md).

Key entities:
- **Cliente** - Client/customer (pessoa física or jurídica)
- **Contato** - Contact person for a client
- **Contrato** - Service contract with client
- **Ativo** - Asset (equipment, devices)
- **Pagamento** - Payment record for contracts
- **Técnico** - Technician with specialties
- **Especialidade** - Technical specialty

## Integration Patterns

### Client Onboarding

When user asks to add a new client:

1. Gather basic information (name, CPF/CNPJ, email, phone)
2. Determine person type (F=física, J=jurídica)
3. Create client record
4. Optionally add contacts
5. Optionally create initial contract

Example:
```python
# User: "Adicione a empresa ABC como cliente"
cliente = client.create_cliente({
    "NOME_RAZAO": "ABC Tecnologia Ltda",
    "NOME_FANTASIA": "ABC Tech",
    "CPF_CNPJ": "12345678000190",
    "EMAIL": "contato@abc.com.br",
    "TELEFONE": "11999998888",
    "TIPO_PESSOA": "J",
    "ATIVO": "S"
})

print(f"Cliente #{cliente['ID_CLIENTE']} criado com sucesso!")
```

### Contract Management

When creating/tracking contracts:

```python
# Get client
clientes = client.list_clientes()
cliente = next((c for c in clientes if 'ABC' in c['NOME_RAZAO']), None)

if cliente:
    # Create contract
    contrato = client.create_contrato({
        "ID_CLIENTE": cliente['ID_CLIENTE'],
        "DATA_INICIO": "2024-01-01",
        "DATA_FIM": "2024-12-31",
        "VALOR_MENSAL": 5000.00,
        "ID_STATUS": 1,
        "DESCRICAO": "Suporte técnico mensal"
    })
```

### Payment Monitoring

Check overdue payments:

```python
from datetime import datetime

pagamentos = client.list_pagamentos()
atrasados = [
    p for p in pagamentos 
    if p['STATUS_PAGAMENTO'] == 'atrasado'
]

for pag in atrasados:
    print(f"Pagamento #{pag['ID_PAGAMENTO']} atrasado - Vencimento: {pag['DATA_VENCIMENTO']}")
```

### Technician Assignment

Find available technicians by specialty:

```python
especialidades = client.list_especialidades()
tecnicos = client.list_tecnicos()

# Find technicians with "Redes" specialty
redes_techs = [
    t for t in tecnicos 
    if 'Redes' in t.get('ESPECIALIDADES', '')
]
```

## Error Handling

Common errors:
- **404 Not Found** - Resource doesn't exist
- **400 Bad Request** - Invalid data format
- **500 Internal Server Error** - Database or server error

Handle gracefully:
```python
try:
    cliente = client.create_cliente(data)
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 400:
        print("Dados inválidos, verifique os campos")
    elif e.response.status_code == 500:
        print("Erro no servidor, tente novamente mais tarde")
```

## Notes

- API runs on VPS: `http://179.0.178.186:3011`
- No authentication required (currently open API)
- Returns first 50 clients on list (pagination not documented)
- Date format: `YYYY-MM-DD`
- Monetary values: decimal numbers
- Person types: `F` (física) or `J` (jurídica)
- Active status: `S` (sim) or `N` (não)
