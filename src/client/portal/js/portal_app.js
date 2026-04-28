// --- Autenticação JWT Interceptor (Portal) ---
const originalPortalFetch = window.fetch;
window.fetch = async function () {
  let [resource, config] = arguments;
  
  const token = localStorage.getItem('portalToken');
  if (token && resource && resource.toString().includes('api/')) {
    if (!config) config = {};
    if (!config.headers) config.headers = {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await originalPortalFetch(resource, config);
  
  if (response.status === 401 || response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error === "Token inválido ou expirado." || errorData.error === "Token não fornecido. Acesso negado.") {
          localStorage.removeItem('portalUser');
          localStorage.removeItem('portalToken');
          window.location.href = 'login.html';
      }
  }
  return response;
};
// -----------------------------------

class PortalManager {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('portalUser'));
        if (!this.user) {
            window.location.href = 'login.html';
            return;
        }
        this.init();
    }

    init() {
        document.getElementById('userName').innerText = this.user.NOME_CONTATO;
        document.getElementById('userClientName').innerText = this.user.CLIENTE_NOME;
        document.getElementById('userAvatar').innerText = this.user.NOME_CONTATO.charAt(0).toUpperCase();

        // Nav click handlers
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = item.getAttribute('data-target');
                this.loadPage(target);
                
                // Update active state
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

        this.loadPage('my-tickets');
        this.loadStatuses();
    }

    async loadStatuses() {
        try {
            const res = await fetch('../../api/status-chamado');
            if (res.ok) {
                this.statuses = await res.json();
            }
        } catch (e) { console.error('Erro ao carregar statuses:', e); }
    }

    applyFilters() {
        if (this.filterTimeout) clearTimeout(this.filterTimeout);
        this.filterTimeout = setTimeout(() => {
            this.loadMyTickets();
        }, 500);
    }

    async loadPage(page) {
        const area = document.getElementById('content-area');
        const template = document.getElementById(`tpl-${page}`);
        
        area.innerHTML = '';
        area.appendChild(template.content.cloneNode(true));

        if (page === 'my-tickets') {
            await this.loadMyTickets();
        } else if (page === 'new-ticket') {
            await this.loadNewTicketForm();
        }
    }

    async loadMyTickets() {
        const tbody = document.getElementById('ticketsListBody');
        const statusFilter = document.getElementById('filterStatus');
        
        // Populate status dropdown if not already done
        if (statusFilter && this.statuses && statusFilter.options.length <= 1) {
            this.statuses.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.ID_STATUS_CHAMADO;
                opt.innerText = s.NOME;
                statusFilter.appendChild(opt);
            });
        }

        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Carregando...</td></tr>';

        try {
            const filters = {
                contactId: this.user.ID_CONTATO,
                ticketId: document.getElementById('filterTicket')?.value || '',
                dateStart: document.getElementById('filterDateStart')?.value || '',
                dateEnd: document.getElementById('filterDateEnd')?.value || '',
                subject: document.getElementById('filterSubject')?.value || '',
                status: document.getElementById('filterStatus')?.value || '',
                serial: document.getElementById('filterSerial')?.value || ''
            };

            const params = new URLSearchParams(filters);
            const res = await fetch(`../../api/portal/chamados?${params.toString()}`);
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Erro HTTP: ${res.status}`);
            }

            const tickets = await res.json();

            if (tickets.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Nenhum chamado encontrado.</td></tr>';
                return;
            }

            tbody.innerHTML = tickets.map(t => {
                const statusClass = (t.STATUS_NOME || 'Aberto').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
                const dataAbertura = t.DATA_ABERTURA ? new Date(t.DATA_ABERTURA).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
                const prazoSla = t.DATA_PRAZO_SLA ? new Date(t.DATA_PRAZO_SLA).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
                
                return `
                <tr>
                    <td><strong>${t.TICKETID || '#'+t.ID_CHAMADO}</strong></td>
                    <td>${dataAbertura}</td>
                    <td style="font-size: 0.8rem; color: var(--primary-light);">${t.NUMERO_SERIE || t.numero_serie || '-'}</td>
                    <td title="${t.DESCRICAO || ''}">${(t.DESCRICAO || '').substring(0, 40)}${(t.DESCRICAO || '').length > 40 ? '...' : ''}</td>
                    <td>
                        <div style="font-size: 0.85rem; font-weight: 500; margin-bottom: 5px;">${prazoSla}</div>
                        <span class="badge status-${statusClass}">${t.STATUS_NOME || 'Aberto'}</span>
                        <div style="font-size: 0.6rem; color: #94a3b8; margin-top: 2px;">${t.SLA_NOME || ''}</div>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="portalManager.viewTicket(${t.ID_CHAMADO})" title="Ver Detalhes">👁️</button>
                    </td>
                </tr>
            `}).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red">Erro ao carregar chamados: ${e.message}</td></tr>`;
        }
    }

    async loadNewTicketForm() {
        const contractSelect = document.getElementById('ticketContract');
        console.log(`[Portal] Loading new ticket form. User Client ID: ${this.user.ID_CLIENTE}`);
        
        try {
            const res = await fetch(`../../api/portal/contratos?clientId=${this.user.ID_CLIENTE}`);
            const contracts = await res.json();
            console.log(`[Portal] Contracts received:`, contracts);

            contractSelect.innerHTML = '<option value="">Selecione o contrato...</option>';
            
            if (!contracts || contracts.length === 0) {
                contractSelect.innerHTML = '<option value="">Nenhum contrato ativo encontrado</option>';
            } else {
                contracts.forEach(c => {
                    contractSelect.innerHTML += `<option value="${c.ID_CONTRATO}">${c.NOME_CONTRATO} (#${c.NUMERO_CONTRATO})</option>`;
                });
            }

            document.getElementById('newTicketForm').onsubmit = (e) => this.handleNewTicket(e);
        } catch (e) {
            console.error('[Portal] Erro ao carregar contratos:', e);
            contractSelect.innerHTML = '<option value="">Erro ao carregar contratos</option>';
        }
    }

    async onContractChange() {
        const contractId = document.getElementById('ticketContract').value;
        const assetSelect = document.getElementById('ticketAsset');
        
        if (!contractId) {
            assetSelect.innerHTML = '<option value="">Selecione o contrato primeiro...</option>';
            return;
        }

        assetSelect.innerHTML = '<option value="">Carregando equipamentos...</option>';

        try {
            const res = await fetch(`../../api/portal/ativos?contractId=${contractId}`);
            this.currentAssets = await res.json();

            assetSelect.innerHTML = '<option value="">Selecione o equipamento...</option>';
            this.currentAssets.forEach(a => {
                assetSelect.innerHTML += `<option value="${a.ID_ATIVO}">${a.NOME_ATIVO} (S/N: ${a.NUMERO_SERIE})</option>`;
            });
        } catch (e) {
            assetSelect.innerHTML = '<option value="">Erro ao carregar.</option>';
        }
    }

    onAssetChange() {
        const assetId = document.getElementById('ticketAsset').value;
        const serialInput = document.getElementById('ticketSerial');
        
        if (!assetId || !this.currentAssets) {
            serialInput.value = '';
            return;
        }

        const asset = this.currentAssets.find(a => a.ID_ATIVO == assetId);
        if (asset) {
            serialInput.value = asset.NUMERO_SERIE || 'N/A';
        } else {
            serialInput.value = '';
        }
    }

    async handleNewTicket(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerText = 'Enviando...';

        const payload = {
            ID_CLIENTE: this.user.ID_CLIENTE,
            ID_CONTATO: this.user.ID_CONTATO,
            ID_CONTRATO: document.getElementById('ticketContract').value,
            ID_ATIVO: document.getElementById('ticketAsset').value,
            DESCRICAO: document.getElementById('ticketDesc').value,
            NUMERO_SERIE: document.getElementById('ticketSerial')?.value || '',
            ORIGEM: 'Portal do Cliente',
            FASE: 'Suporte'
        };

        try {
            const res = await fetch('../../api/portal/chamados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Chamado aberto com sucesso!');
                this.loadPage('my-tickets');
                // Force update sidebar active state
                document.querySelectorAll('.nav-item').forEach(i => {
                    i.classList.toggle('active', i.getAttribute('data-target') === 'my-tickets');
                });
            } else {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Erro ao salvar');
            }
        } catch (error) {
            alert('Erro ao abrir o chamado: ' + error.message);
            btn.disabled = false;
            btn.innerText = 'Abrir Chamado Técnico';
        }
    }

    async viewTicket(id) {
        const modal = document.getElementById('ticketDetailModal');
        const body = document.getElementById('modalTicketBody');
        const modalTitle = document.getElementById('modalTicketId');
        modalTitle.innerText = `#${id}`;
        
        body.innerHTML = 'Carregando detalhes...';
        modal.classList.add('active');
 
        try {
            const res = await fetch(`../../api/portal/chamados/${id}`);
            const t = await res.json();
            
            if (t.TICKETID) modalTitle.innerText = t.TICKETID;

            const statusClass = (t.STATUS_NOME || 'Aberto').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
            const dataFmt = new Date(t.DATA_ABERTURA).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const prazoFmt = t.DATA_PRAZO_SLA ? new Date(t.DATA_PRAZO_SLA).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

            body.innerHTML = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <label style="color:#64748b; font-size: 0.8rem; display:block">Status / SLA</label>
                        <span class="badge status-${statusClass}">${t.STATUS_NOME || 'Aberto'}</span>
                        <div style="font-size: 0.7rem; color: #64748b; margin-top: 4px;">${t.SLA_NOME || 'N/A'}</div>
                    </div>
                    <div>
                        <label style="color:#64748b; font-size: 0.8rem; display:block">Data de Abertura</label>
                        <strong>${dataFmt}</strong>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                    <div>
                        <label style="color:#64748b; font-size: 0.8rem; display:block">Equipamento / Série</label>
                        <strong>${t.NOME_ATIVO || t.nome_ativo || 'Equipamento não informado'} (S/N: ${t.NUMERO_SERIE || t.numero_serie || '-'})</strong>
                    </div>
                    <div>
                        <label style="color:#ef4444; font-size: 0.8rem; display:block; font-weight: 600;">Prazo de Atendimento</label>
                        <strong style="color: #ef4444;">${prazoFmt}</strong>
                    </div>
                </div>

                ${t.TECNICO_NOME ? `
                <div style="margin-top:20px; padding: 15px; background: #f1f5f9; border-radius: 10px; border: 1px solid #cbd5e1;">
                    <label style="color:#475569; font-size: 0.75rem; display:block; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Técnico Responsável</label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 40px; height: 40px; background: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">
                            ${t.TECNICO_NOME.charAt(0)}
                        </div>
                        <div>
                            <div style="font-weight: 700; color: #1e293b;">${t.TECNICO_NOME}</div>
                            <div style="font-size: 0.85rem; color: #64748b;">${t.TECNICO_EMAIL || ''} ${t.TECNICO_FONE ? ' • ' + t.TECNICO_FONE : ''}</div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <div style="margin-top:20px">
                    <label style="color:#64748b; font-size: 0.8rem; display:block">Descrição do Problema</label>
                    <div style="background:#f8fafc; color: #1e293b; padding:15px; border-radius:10px; border:1px solid #e2e8f0; margin-top:5px; white-space: pre-wrap;">${t.DESCRICAO}</div>
                </div>
                ${t.SOLUCAO ? `
                <div style="margin-top:20px">
                    <label style="color:#64748b; font-size: 0.8rem; display:block">Solução / Resposta</label>
                    <div style="background:#f0f9ff; color: #1e293b; padding:15px; border-radius:10px; border:1px solid #bae6fd; margin-top:5px; white-space: pre-wrap;">${t.SOLUCAO}</div>
                </div>
                ` : ''}
            `;
        } catch (e) {
            body.innerHTML = 'Erro ao carregar detalhes.';
        }
    }

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
    }

    logout() {
        localStorage.removeItem('portalUser');
        window.location.href = 'login.html';
    }
}

const portalManager = new PortalManager();
