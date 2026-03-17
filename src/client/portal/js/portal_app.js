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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Carregando...</td></tr>';

        try {
            const res = await fetch(`../../api/portal/chamados?contactId=${this.user.ID_CONTATO}`);
            const tickets = await res.json();

            if (tickets.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Nenhum chamado encontrado.</td></tr>';
                return;
            }

            tbody.innerHTML = tickets.map(t => {
                const statusClass = (t.STATUS_NOME || 'Aberto').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
                return `
                <tr>
                    <td><strong>${t.TICKETID || '#'+t.ID_CHAMADO}</strong></td>
                    <td>${t.DATA_ABERTURA ? new Date(t.DATA_ABERTURA).toLocaleDateString('pt-BR') : 'N/A'}</td>
                    <td title="${t.DESCRICAO || ''}">${(t.DESCRICAO || '').substring(0, 50)}${(t.DESCRICAO || '').length > 50 ? '...' : ''}</td>
                    <td>
                        <span class="badge status-${statusClass}">${t.STATUS_NOME || 'Aberto'}</span>
                        <div style="font-size: 0.7rem; color: #64748b; margin-top: 4px;">SLA: ${t.SLA_PREVISTO || 'N/A'}</div>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="portalManager.viewTicket(${t.ID_CHAMADO})" title="Ver Detalhes">👁️</button>
                    </td>
                </tr>
            `}).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red">Erro ao carregar chamados.</td></tr>';
        }
    }

    async loadNewTicketForm() {
        const contractSelect = document.getElementById('ticketContract');
        
        try {
            const res = await fetch(`../../api/portal/contratos?clientId=${this.user.ID_CLIENTE}`);
            const contracts = await res.json();

            contractSelect.innerHTML = '<option value="">Selecione o contrato...</option>';
            contracts.forEach(c => {
                contractSelect.innerHTML += `<option value="${c.ID_CONTRATO}">${c.NOME_CONTRATO} (#${c.NUMERO_CONTRATO})</option>`;
            });

            document.getElementById('newTicketForm').onsubmit = (e) => this.handleNewTicket(e);
        } catch (e) {
            console.error('Error loading contracts', e);
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
            const assets = await res.json();

            assetSelect.innerHTML = '<option value="">Selecione o equipamento...</option>';
            assets.forEach(a => {
                assetSelect.innerHTML += `<option value="${a.ID_ATIVO}">${a.NOME_ATIVO} (S/N: ${a.NUMERO_SERIE})</option>`;
            });
        } catch (e) {
            assetSelect.innerHTML = '<option value="">Erro ao carregar.</option>';
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
        document.getElementById('modalTicketId').innerText = `#${id}`;
        
        body.innerHTML = 'Carregando detalhes...';
        modal.classList.add('active');

        try {
            const res = await fetch(`../../api/portal/chamados/${id}`);
            const t = await res.json();
            const statusClass = t.STATUS.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');

            body.innerHTML = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <label style="color:#64748b; font-size: 0.8rem; display:block">Status</label>
                        <span class="badge status-${statusClass}">${t.STATUS}</span>
                    </div>
                    <div>
                        <label style="color:#64748b; font-size: 0.8rem; display:block">Data de Abertura</label>
                        <strong>${new Date(t.DATA_ABERTURA).toLocaleDateString('pt-BR')}</strong>
                    </div>
                </div>
                <div style="margin-top:20px">
                    <label style="color:#64748b; font-size: 0.8rem; display:block">Equipamento</label>
                    <strong>${t.NOME_ATIVO} (S/N: ${t.NUMERO_SERIE})</strong>
                </div>
                <div style="margin-top:20px">
                    <label style="color:#64748b; font-size: 0.8rem; display:block">Descrição do Problema</label>
                    <div style="background:#f8fafc; padding:15px; border-radius:10px; border:1px solid #e2e8f0; margin-top:5px; white-space: pre-wrap;">${t.DESCRICAO}</div>
                </div>
                ${t.SOLUCAO ? `
                <div style="margin-top:20px">
                    <label style="color:#64748b; font-size: 0.8rem; display:block">Solução / Resposta</label>
                    <div style="background:#f0f9ff; padding:15px; border-radius:10px; border:1px solid #bae6fd; margin-top:5px; white-space: pre-wrap;">${t.SOLUCAO}</div>
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
