#!/usr/bin/env python3
"""
ColaborarCRM API Client
Handles all interactions with Colaborar CRM REST API
"""

import requests
from typing import Dict, List, Optional, Any
import json


class ColaborarCRMClient:
    """Client for interacting with Colaborar CRM API"""
    
    def __init__(self, base_url: str = "http://179.0.178.186:3011"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request to API"""
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json() if response.content else {}
    
    # Health Check
    def health_check(self) -> Dict[str, Any]:
        """Check server and database status"""
        return self._request('GET', '/api/health')
    
    # Clientes (Clients)
    def list_clientes(self) -> List[Dict[str, Any]]:
        """List first 50 clients ordered by name"""
        return self._request('GET', '/api/clientes')
    
    def create_cliente(self, cliente: Dict[str, Any]) -> Dict[str, Any]:
        """Create new client"""
        return self._request('POST', '/api/clientes', json=cliente)
    
    def update_cliente(self, id_cliente: int, cliente: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing client"""
        return self._request('PUT', f'/api/clientes/{id_cliente}', json=cliente)
    
    def delete_cliente(self, id_cliente: int) -> Dict[str, Any]:
        """Delete client"""
        return self._request('DELETE', f'/api/clientes/{id_cliente}')
    
    # Contatos (Contacts)
    def list_contatos(self) -> List[Dict[str, Any]]:
        """List all contacts"""
        return self._request('GET', '/api/contatos')
    
    def create_contato(self, contato: Dict[str, Any]) -> Dict[str, Any]:
        """Create new contact"""
        return self._request('POST', '/api/contatos', json=contato)
    
    def update_contato(self, id_contato: int, contato: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing contact"""
        return self._request('PUT', f'/api/contatos/{id_contato}', json=contato)
    
    def delete_contato(self, id_contato: int) -> Dict[str, Any]:
        """Delete contact"""
        return self._request('DELETE', f'/api/contatos/{id_contato}')
    
    # Contratos (Contracts)
    def list_contratos(self) -> List[Dict[str, Any]]:
        """List all contracts with client and status details"""
        return self._request('GET', '/api/contratos')
    
    def create_contrato(self, contrato: Dict[str, Any]) -> Dict[str, Any]:
        """Create new contract"""
        return self._request('POST', '/api/contratos', json=contrato)
    
    def update_contrato(self, id_contrato: int, contrato: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing contract"""
        return self._request('PUT', f'/api/contratos/{id_contrato}', json=contrato)
    
    def delete_contrato(self, id_contrato: int) -> Dict[str, Any]:
        """Delete contract"""
        return self._request('DELETE', f'/api/contratos/{id_contrato}')
    
    # Ativos (Assets)
    def list_ativos(self) -> List[Dict[str, Any]]:
        """List all assets with owner and status details"""
        return self._request('GET', '/api/ativos')
    
    def create_ativo(self, ativo: Dict[str, Any]) -> Dict[str, Any]:
        """Create new asset"""
        return self._request('POST', '/api/ativos', json=ativo)
    
    def update_ativo(self, id_ativo: int, ativo: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing asset"""
        return self._request('PUT', f'/api/ativos/{id_ativo}', json=ativo)
    
    def delete_ativo(self, id_ativo: int) -> Dict[str, Any]:
        """Delete asset"""
        return self._request('DELETE', f'/api/ativos/{id_ativo}')
    
    # Status
    def list_status(self) -> List[Dict[str, Any]]:
        """List all asset status codes"""
        return self._request('GET', '/api/status')
    
    def create_status(self, status: Dict[str, Any]) -> Dict[str, Any]:
        """Create new asset status"""
        return self._request('POST', '/api/status', json=status)
    
    def update_status(self, id_status: int, status: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing status"""
        return self._request('PUT', f'/api/status/{id_status}', json=status)
    
    def delete_status(self, id_status: int) -> Dict[str, Any]:
        """Delete status"""
        return self._request('DELETE', f'/api/status/{id_status}')
    
    # Técnicos (Technicians)
    def list_tecnicos(self) -> List[Dict[str, Any]]:
        """List all technicians with specialties"""
        return self._request('GET', '/api/tecnicos')
    
    def create_tecnico(self, tecnico: Dict[str, Any]) -> Dict[str, Any]:
        """Create new technician"""
        return self._request('POST', '/api/tecnicos', json=tecnico)
    
    def update_tecnico(self, id_tecnico: int, tecnico: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing technician"""
        return self._request('PUT', f'/api/tecnicos/{id_tecnico}', json=tecnico)
    
    def delete_tecnico(self, id_tecnico: int) -> Dict[str, Any]:
        """Delete technician"""
        return self._request('DELETE', f'/api/tecnicos/{id_tecnico}')
    
    # Especialidades (Specialties)
    def list_especialidades(self) -> List[Dict[str, Any]]:
        """List all technician specialties"""
        return self._request('GET', '/api/especialidades')
    
    def create_especialidade(self, especialidade: Dict[str, Any]) -> Dict[str, Any]:
        """Create new specialty"""
        return self._request('POST', '/api/especialidades', json=especialidade)
    
    def update_especialidade(self, id_especialidade: int, especialidade: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing specialty"""
        return self._request('PUT', f'/api/especialidades/{id_especialidade}', json=especialidade)
    
    def delete_especialidade(self, id_especialidade: int) -> Dict[str, Any]:
        """Delete specialty"""
        return self._request('DELETE', f'/api/especialidades/{id_especialidade}')
    
    # Pagamentos (Payments)
    def list_pagamentos(self) -> List[Dict[str, Any]]:
        """List all payments"""
        return self._request('GET', '/api/pagamentos')
    
    def create_pagamento(self, pagamento: Dict[str, Any]) -> Dict[str, Any]:
        """Create new payment record"""
        return self._request('POST', '/api/pagamentos', json=pagamento)
    
    def update_pagamento(self, id_pagamento: int, pagamento: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing payment"""
        return self._request('PUT', f'/api/pagamentos/{id_pagamento}', json=pagamento)
    
    def delete_pagamento(self, id_pagamento: int) -> Dict[str, Any]:
        """Delete payment"""
        return self._request('DELETE', f'/api/pagamentos/{id_pagamento}')
    
    # Auditoria (Audit Logs)
    def list_auditoria(self) -> List[Dict[str, Any]]:
        """List CRM audit logs"""
        return self._request('GET', '/api/auditoria')
    
    # Permissões (Permissions)
    def list_permissoes(self) -> List[Dict[str, Any]]:
        """List all screen permissions"""
        return self._request('GET', '/api/permissoes')
    
    def create_permissao(self, permissao: Dict[str, Any]) -> Dict[str, Any]:
        """Create new permission"""
        return self._request('POST', '/api/permissoes', json=permissao)
    
    def delete_permissao(self, id_perfil: int, id_screen: int) -> Dict[str, Any]:
        """Delete permission"""
        return self._request('DELETE', '/api/permissoes', json={
            'ID_PERFIL': id_perfil,
            'ID_SCREEN': id_screen
        })
    
    # Ações (Actions)
    def list_acoes(self) -> List[Dict[str, Any]]:
        """List all audit actions"""
        return self._request('GET', '/api/acoes')
    
    # Perfis (Profiles)
    def create_perfil(self, nome: str) -> Dict[str, Any]:
        """Create new user profile"""
        return self._request('POST', '/api/perfis', json={'NOME': nome})
    
    def update_perfil(self, id_perfil: int, nome: str) -> Dict[str, Any]:
        """Update existing profile"""
        return self._request('PUT', f'/api/perfis/{id_perfil}', json={'NOME': nome})
    
    def delete_perfil(self, id_perfil: int) -> Dict[str, Any]:
        """Delete profile"""
        return self._request('DELETE', f'/api/perfis/{id_perfil}')
    
    # Agendamentos (Appointments)
    def delete_agendamento(self, id_agendamento: int) -> Dict[str, Any]:
        """Delete appointment"""
        return self._request('DELETE', f'/api/agendamentos/{id_agendamento}')


def main():
    """CLI interface for ColaborarCRM client"""
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='ColaborarCRM API Client')
    parser.add_argument('resource', choices=[
        'health', 'clientes', 'contatos', 'contratos', 'ativos',
        'status', 'tecnicos', 'especialidades', 'pagamentos',
        'auditoria', 'permissoes', 'acoes'
    ])
    parser.add_argument('--action', choices=['list', 'create', 'update', 'delete'], default='list')
    parser.add_argument('--id', type=int, help='Resource ID for update/delete')
    parser.add_argument('--data', help='JSON data for create/update')
    parser.add_argument('--base-url', default='http://179.0.178.186:3011', help='API base URL')
    
    args = parser.parse_args()
    
    client = ColaborarCRMClient(base_url=args.base_url)
    
    try:
        if args.resource == 'health':
            result = client.health_check()
            print(json.dumps(result, indent=2, ensure_ascii=False))
            return
        
        # Generic list
        if args.action == 'list':
            method = getattr(client, f'list_{args.resource}')
            result = method()
            print(json.dumps(result, indent=2, ensure_ascii=False))
        
        # Create
        elif args.action == 'create':
            if not args.data:
                print("[ERROR] --data required for create")
                sys.exit(1)
            data = json.loads(args.data)
            method = getattr(client, f'create_{args.resource}')
            result = method(data)
            print(json.dumps(result, indent=2, ensure_ascii=False))
        
        # Update
        elif args.action == 'update':
            if not args.id or not args.data:
                print("[ERROR] --id and --data required for update")
                sys.exit(1)
            data = json.loads(args.data)
            method = getattr(client, f'update_{args.resource}')
            result = method(args.id, data)
            print(json.dumps(result, indent=2, ensure_ascii=False))
        
        # Delete
        elif args.action == 'delete':
            if not args.id:
                print("[ERROR] --id required for delete")
                sys.exit(1)
            method = getattr(client, f'delete_{args.resource}')
            result = method(args.id)
            print(json.dumps(result, indent=2, ensure_ascii=False))
    
    except requests.exceptions.HTTPError as e:
        print(f"[ERROR] HTTP Error: {e}")
        if e.response is not None:
            try:
                print(json.dumps(e.response.json(), indent=2, ensure_ascii=False))
            except:
                print(e.response.text)
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
