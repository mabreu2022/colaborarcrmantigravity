# ColaborarCRM API Reference

Complete API documentation for Colaborar CRM.

**Base URL:** `http://179.0.178.186:3011`  
**Authentication:** Not specified in docs (appears to be open API)

## Table of Contents
1. [Health Check](#health-check)
2. [Clientes (Clients)](#clientes)
3. [Contatos (Contacts)](#contatos)
4. [Contratos (Contracts)](#contratos)
5. [Ativos (Assets)](#ativos)
6. [Status](#status)
7. [Técnicos (Technicians)](#tecnicos)
8. [Especialidades (Specialties)](#especialidades)
9. [Pagamentos (Payments)](#pagamentos)
10. [Auditoria (Audit Logs)](#auditoria)
11. [Permissões (Permissions)](#permissoes)
12. [Ações (Actions)](#acoes)

---

## Health Check

### GET /api/health
Check server and database status.

**Response:**
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## Clientes

### GET /api/clientes
List first 50 clients ordered by name.

**Response:** Array of client objects

### POST /api/clientes
Create new client.

**Request:**
```json
{
  "NOME_RAZAO": "Empresa XYZ Ltda",
  "NOME_FANTASIA": "XYZ",
  "CPF_CNPJ": "12345678000190",
  "EMAIL": "contato@xyz.com",
  "TELEFONE": "11999999999",
  "TIPO_PESSOA": "J",
  "ATIVO": "S"
}
```

### PUT /api/clientes/{id}
Update existing client.

### DELETE /api/clientes/{id}
Delete client.

---

## Contatos

### GET /api/contatos
List all contacts.

**Response:** Array of contact objects

### POST /api/contatos
Create new contact for a client.

**Request:**
```json
{
  "ID_CLIENTE": 1,
  "NOME_CONTATO": "João Silva",
  "TELEFONE_CONTATO": "11988887777",
  "EMAIL_CONTATO": "joao@xyz.com",
  "CARGO": "Gerente",
  "TIPO_CONTATO": "Principal"
}
```

### PUT /api/contatos/{id}
Update existing contact.

### DELETE /api/contatos/{id}
Delete contact.

---

## Contratos

### GET /api/contratos
List all contracts with client and status details.

**Response:**
```json
[
  {
    "ID_CONTRATO": 1,
    "ID_CLIENTE": 5,
    "NOME_RAZAO": "Empresa ABC",
    "DATA_INICIO": "2024-01-01",
    "DATA_FIM": "2024-12-31",
    "VALOR_MENSAL": 5000.00,
    "ID_STATUS": 1,
    "STATUS_NOME": "Ativo",
    "DESCRICAO": "Contrato de manutenção",
    "OBSERVACOES": "Renovação automática"
  }
]
```

### POST /api/contratos
Create new contract.

**Request:**
```json
{
  "ID_CLIENTE": 5,
  "DATA_INICIO": "2024-01-01",
  "DATA_FIM": "2024-12-31",
  "VALOR_MENSAL": 5000.00,
  "ID_STATUS": 1,
  "DESCRICAO": "Contrato de serviços",
  "OBSERVACOES": "Detalhes adicionais"
}
```

### PUT /api/contratos/{id}
Update existing contract.

### DELETE /api/contratos/{id}
Delete contract.

---

## Ativos

### GET /api/ativos
List all assets with owner and status details.

**Response:**
```json
[
  {
    "ID_ATIVO": 1,
    "DESCRICAO": "Notebook Dell",
    "NUMERO_SERIE": "ABC123XYZ",
    "ID_STATUS": 1,
    "STATUS_NOME": "Em uso",
    "ID_CLIENTE_PROPRIETARIO": 5,
    "PROPRIETARIO": "Empresa ABC"
  }
]
```

### POST /api/ativos
Create new asset.

### PUT /api/ativos/{id}
Update existing asset.

### DELETE /api/ativos/{id}
Delete asset.

---

## Status

### GET /api/status
List all asset status codes.

**Response:**
```json
[
  {
    "ID_STATUS": 1,
    "STATUS": "Ativo"
  },
  {
    "ID_STATUS": 2,
    "STATUS": "Inativo"
  }
]
```

### POST /api/status
Create new status.

### PUT /api/status/{id}
Update status.

### DELETE /api/status/{id}
Delete status.

---

## Técnicos

### GET /api/tecnicos
List all technicians with specialties.

**Response:**
```json
[
  {
    "ID_TECNICO": 1,
    "NOME": "Carlos Silva",
    "CPF": "12345678900",
    "EMAIL": "carlos@email.com",
    "TELEFONE": "11999998888",
    "ESPECIALIDADES": "Redes, Hardware",
    "ESPECIALIDADES_IDS": "1,3"
  }
]
```

### POST /api/tecnicos
Create new technician with specialties.

### PUT /api/tecnicos/{id}
Update technician and specialties.

### DELETE /api/tecnicos/{id}
Delete technician.

---

## Especialidades

### GET /api/especialidades
List all technician specialties.

**Response:**
```json
[
  {
    "ID_ESPECIALIDADE": 1,
    "NOME": "Redes"
  },
  {
    "ID_ESPECIALIDADE": 2,
    "NOME": "Software"
  }
]
```

### POST /api/especialidades
Create new specialty.

### PUT /api/especialidades/{id}
Update specialty.

### DELETE /api/especialidades/{id}
Delete specialty.

---

## Pagamentos

### GET /api/pagamentos
List all payments.

**Response:**
```json
[
  {
    "ID_PAGAMENTO": 1,
    "ID_CONTRATO": 5,
    "DATA_VENCIMENTO": "2024-01-15",
    "DATA_PAGAMENTO": "2024-01-10",
    "VALOR_PAGO": 5000.00,
    "STATUS_PAGAMENTO": "pago"
  }
]
```

**Status values:** `pendente`, `pago`, `atrasado`

### POST /api/pagamentos
Create new payment record.

### PUT /api/pagamentos/{id}
Update payment.

### DELETE /api/pagamentos/{id}
Delete payment.

---

## Auditoria

### GET /api/auditoria
List CRM audit logs.

**Response:**
```json
[
  {
    "ID_LOG": 1,
    "ID_USUARIO": 1,
    "ID_ACAO": 2,
    "ENTIDADE": "CLIENTE",
    "ID_ENTIDADE": 5,
    "DATA_HORA": "2024-01-15T10:30:00"
  }
]
```

---

## Permissões

### GET /api/permissoes
List all screen permissions for profiles.

### POST /api/permissoes
Create new permission.

**Request:**
```json
{
  "ID_PERFIL": 1,
  "NOME_TELA": "clientes",
  "PODE_ACESSAR": true
}
```

### DELETE /api/permissoes
Delete permission (requires ID_PERFIL and ID_SCREEN in body).

---

## Ações

### GET /api/acoes
List all audit actions.

**Response:**
```json
[
  {
    "ID_ACAO": 1,
    "NOME": "CREATE",
    "DESCRICAO": "Criação de registro"
  },
  {
    "ID_ACAO": 2,
    "NOME": "UPDATE",
    "DESCRICAO": "Atualização de registro"
  }
]
```
