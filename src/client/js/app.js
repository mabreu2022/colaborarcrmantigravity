
// App Manager
class AppManager {
    constructor() {
        this.checkAuth();
        this.init();
    }

    checkAuth() {
        const user = localStorage.getItem('user');
        if (!user) {
            window.location.href = 'login.html';
        }
    }

    init() {
        console.log("Colaborar CRM Initialized");
        this.setupUser();
        this.setupNavigation();

        // Auto-load Dashboard
        this.loadPage('dashboard');
        const dashboardNav = document.querySelector('.nav-item[data-target="dashboard"]');
        if (dashboardNav) dashboardNav.classList.add('active');
    }

    setupUser(userData) {
        const user = userData || JSON.parse(localStorage.getItem('user'));

        const nome = user ? (user.NOME || user.Nome || user.nome || user.name) : null;

        if (nome) {
            const userNameEl = document.querySelector('.user-name');
            if (userNameEl) userNameEl.textContent = nome;

            const avatarEl = document.querySelector('.avatar');
            if (avatarEl) {
                const initial = nome.charAt(0).toUpperCase();
                avatarEl.textContent = initial;
            }
        } else {
            console.warn("Aguardando dados do usuário...");
            const avatarEl = document.querySelector('.avatar');
            if (avatarEl) avatarEl.textContent = '?';
        }

        if (user) {
            this.enforcePermissions(user);
        }
    }

    enforcePermissions(user) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const target = item.dataset.target;
            if (!target) return;

            // Map target to permission column
            const permissionKey = `CAN_${target.toUpperCase()}`;

            if (user[permissionKey] === 0) {
                item.style.display = 'none';
                // If user is on a forbidden page, redirect to dashboard or first allowed
                if (this.currentPage === target) {
                    this.loadPage('dashboard');
                }
            } else {
                item.style.display = 'flex';
            }
        });
    }

    logout() {
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                // Active State
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                const target = item.dataset.target;
                this.loadPage(target);
            });
        });
    }

    toggleSidebar() {
        console.log('Toggle Sidebar Clicked');
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            console.log('Sidebar classes:', sidebar.classList.toString());
        } else {
            console.error('Sidebar element not found');
        }
    }

    async loadPage(page) {
        this.currentPage = page;
        const contentArea = document.getElementById('content-area');
        const breadcrumbs = document.querySelector('.breadcrumbs');
        if (breadcrumbs) {
            breadcrumbs.textContent = page.charAt(0).toUpperCase() + page.slice(1);
        }
        // Simple router logic - to be expanded
        switch (page) {
            case 'clients':
                contentArea.innerHTML = '<h2>Carregando Clientes...</h2>';
                await this.loadClients();
                break;
            case 'dashboard':
                contentArea.innerHTML = '<div class="loading">Carregando Dashboard...</div>';
                await this.loadDashboard();
                break;
            case 'contracts':
                contentArea.innerHTML = '<div class="loading">Carregando Contratos...</div>';
                await this.loadContracts();
                break;
            case 'assets':
                contentArea.innerHTML = '<div class="loading">Carregando Ativos...</div>';
                await this.loadAssets();
                break;
            case 'users':
                contentArea.innerHTML = '<div class="loading">Carregando Usuários...</div>';
                await this.loadUsers();
                break;
            case 'chamados':
                contentArea.innerHTML = '<div class="loading">Carregando Chamados...</div>';
                await this.loadChamados();
                break;
            case 'agenda':
                contentArea.innerHTML = '<div class="loading">Carregando Agenda...</div>';
                await this.loadAgenda();
                break;
            case 'tecnicos':
                await this.loadTechniciansView();
                break;
            case 'especialidades':
                await this.loadSpecialtiesView();
                break;
            case 'reports':
                await this.loadReportsView();
                break;
            case 'settings':
                await this.loadSettingsView();
                break;
            case 'estoque':
                await this.loadEstoqueView();
                break;
            case 'fornecedores':
                await this.loadFornecedoresView();
                break;
            default:
                contentArea.innerHTML = `<h2>${page} Content Placeholder</h2>`;
        }
    }

    // ... (loadContracts and renderContracts remain) ...

    async loadEstoqueView() {
        const contentArea = document.getElementById('content-area');
        if (window.estoqueManager) {
            contentArea.innerHTML = window.estoqueManager.getTemplate();
            await window.estoqueManager.init();
        } else {
            contentArea.innerHTML = '<div class="error-message">Erro: Gestor de estoque não carregado.</div>';
        }
    }

    async loadFornecedoresView() {
        const contentArea = document.getElementById('content-area');
        if (window.estoqueManager) {
            const breadcrumbs = document.querySelector('.breadcrumbs');
            if (breadcrumbs) breadcrumbs.textContent = 'Fornecedores';
            contentArea.innerHTML = window.estoqueManager.getTemplate();
            window.estoqueManager.switchTab('fornecedores');
        } else {
            contentArea.innerHTML = '<div class="error-message">Erro: Gestor de estoque não carregado.</div>';
        }
    }

    async loadAssets() {
        try {
            const response = await fetch('api/ativos');
            if (!response.ok) throw new Error('Erro ao carregar ativos');
            const data = await response.json();
            this.assetsData = data; // Store for filtering
            this.clientsData = await (await fetch('api/clientes')).json(); // Ensure clients loaded for Owner filter
            this.currentAssetFilter = 'Todos';
            this.assetSearchTerm = '';
            this.assetOwnerFilter = '';
            this.renderAssets(data);
        } catch (error) {
            console.error(error);
            this.showError('Erro ao carregar ativos', error.message);
        }
    }

    // --- ASSETS CRUD ---

    async openAssetModal(assetData = null) {
        const modal = document.getElementById('assetModal');
        const title = document.getElementById('assetModalTitle');
        const form = document.getElementById('assetForm');

        form.reset();
        document.getElementById('assetId').value = '';
        await this.loadDropdowns();

        if (assetData) {
            const asset = JSON.parse(decodeURIComponent(assetData));
            title.textContent = 'Editar Ativo';
            document.getElementById('assetId').value = asset.ID_ATIVO;
            document.getElementById('assetDesc').value = asset.DESCRICAO;
            document.getElementById('assetSerial').value = asset.NUMERO_SERIE || '';
            document.getElementById('assetStatusDb').value = asset.ID_STATUS;
            document.getElementById('assetOwner').value = asset.ID_CLIENTE_PROPRIETARIO || '';
            if (document.getElementById('assetProduct')) {
                document.getElementById('assetProduct').value = asset.ID_PRODUTO || '';
            }
        } else {
            title.textContent = 'Novo Ativo';
        }
        modal.classList.add('active');
    }

    async saveAsset() {
        const id = document.getElementById('assetId').value;
        const data = {
            DESCRICAO: document.getElementById('assetDesc').value,
            NUMERO_SERIE: document.getElementById('assetSerial').value,
            ID_STATUS: document.getElementById('assetStatusDb').value,
            ID_CLIENTE_PROPRIETARIO: document.getElementById('assetOwner').value || null,
            ID_PRODUTO: document.getElementById('assetProduct')?.value || null
        };

        if (!data.DESCRICAO || !data.ID_STATUS) {
            alert('Descrição e Status são obrigatórios!');
            return;
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `api/ativos/${id}` : 'api/ativos';
            const result = await (await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json();
            if (!result.success && !result.id) throw new Error(result.error || 'Erro');
            this.closeModal('assetModal');
            this.loadAssets();
        } catch (e) { alert(e.message); }
    }

    async deleteAsset(id) {
        if (!confirm('Excluir ativo?')) return;
        await fetch(`api/ativos/${id}`, { method: 'DELETE' });
        this.loadAssets();
    }

    filterAssets() {
        const term = this.assetSearchTerm.toLowerCase();
        const ownerId = this.assetOwnerFilter;
        const statusFilter = this.currentAssetFilter;

        const filtered = this.assetsData.filter(item => {
            // Text Search
            const desc = (item.DESCRICAO || '').toLowerCase();
            const serial = (item.NUMERO_SERIE || '').toLowerCase();
            const matchesTerm = !term || desc.includes(term) || serial.includes(term);

            // Owner Filter
            const matchesOwner = !ownerId || item.ID_CLIENTE_PROPRIETARIO == ownerId;

            // Status Filter
            const status = (item.STATUS_NOME || item.STATUS || '').toLowerCase();
            let matchesStatus = true;
            if (statusFilter === 'Locados') matchesStatus = status.includes('locado') || status.includes('alugado');
            else if (statusFilter === 'Estoque') matchesStatus = status.includes('estoque') || status.includes('disponivel') || status.includes('disponível') || item.ID_STATUS == 2;
            else if (statusFilter === 'Manutenção') matchesStatus = status.includes('manutenção') || status.includes('manutencao');

            return matchesTerm && matchesOwner && matchesStatus;
        });
        this.renderAssets(filtered, false); // false = don't reset filters
    }

    renderAssets(data, resetFilters = true) {
        const contentArea = document.getElementById('content-area');

        // Optimisation: Check if Assets Table Body already exists
        const existingTbody = document.getElementById('assetsTableBody');

        if (existingTbody) {
            // Only update the table rows, don't touch the header (keeps input focus)
            if (data.length === 0) {
                existingTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 1rem;">Nenhum ativo encontrado.</td></tr>';
            } else {
                let rows = '';
                data.forEach(item => {
                    const itemData = encodeURIComponent(JSON.stringify(item));
                    rows += `<tr>
                        <td>${item.ID_ATIVO}</td>
                        <td>${item.DESCRICAO}</td>
                        <td>${item.NUMERO_SERIE || '-'}</td>
                        <td><span class="badge">${item.STATUS_NOME || item.STATUS || '-'}</span></td>
                        <td>${item.PROPRIETARIO || '-'}</td>
                        <td>
                            <button class="btn-icon" onclick="appManager.openAssetModal('${itemData}')">✏️</button>
                            <button class="btn-icon" onclick="appManager.deleteAsset(${item.ID_ATIVO})">🗑️</button>
                        </td>
                    </tr>`;
                });
                existingTbody.innerHTML = rows;
            }

            // Update Filter Buttons Active State
            const buttons = contentArea.querySelectorAll('.btn-group .btn-sm');
            buttons.forEach(btn => {
                const isSelected = btn.textContent.trim() === this.currentAssetFilter;
                if (isSelected) btn.classList.add('active');
                else btn.classList.remove('active');
            });

            return;
        }

        // Build Owner Options
        let ownerOptions = '<option value="">Todos os Proprietários</option>';
        if (this.clientsData) {
            this.clientsData.forEach(c => {
                ownerOptions += `<option value="${c.ID_CLIENTE}" ${this.assetOwnerFilter == c.ID_CLIENTE ? 'selected' : ''}>${c.NOME_RAZAO}</option>`;
            });
        }

        const header = `
            <div class="card">
                 <div class="card-header" style="flex-wrap: wrap; gap: 10px;">
                    <h2>Ativos</h2>
                    <div class="header-actions" style="flex-wrap: wrap;">
                        <input type="text" class="form-control" style="width: 200px;" placeholder="Buscar descrição/série..." 
                               value="${this.assetSearchTerm}" oninput="appManager.assetSearchTerm = this.value; appManager.filterAssets()">
                        
                        <select class="form-control" style="width: 200px;" onchange="appManager.assetOwnerFilter = this.value; appManager.filterAssets()">
                            ${ownerOptions}
                        </select>

                        <div class="btn-group">
                            <button class="btn-sm ${this.currentAssetFilter === 'Todos' ? 'active' : ''}" onclick="appManager.currentAssetFilter='Todos'; appManager.filterAssets()">Todos</button>
                            <button class="btn-sm ${this.currentAssetFilter === 'Locados' ? 'active' : ''}" onclick="appManager.currentAssetFilter='Locados'; appManager.filterAssets()">Locados</button>
                            <button class="btn-sm ${this.currentAssetFilter === 'Estoque' ? 'active' : ''}" onclick="appManager.currentAssetFilter='Estoque'; appManager.filterAssets()">Estoque</button>
                            <button class="btn-sm ${this.currentAssetFilter === 'Manutenção' ? 'active' : ''}" onclick="appManager.currentAssetFilter='Manutenção'; appManager.filterAssets()">Manutenção</button>
                        </div>
                        <button class="btn-primary" onclick="appManager.openAssetModal()">Novo Ativo</button>
                    </div>
                </div>`;

        let table = header + `
                <div class="table-responsive"><table class="data-table"><thead><tr>
                <th>ID</th><th>Descrição</th><th>Nº Série</th><th>Status</th><th>Proprietário</th><th>Ações</th>
                </tr></thead><tbody id="assetsTableBody">`;

        if (data.length === 0) {
            table += '<tr><td colspan="6" style="text-align:center; padding: 1rem;">Nenhum ativo encontrado.</td></tr>';
        } else {
            data.forEach(item => {
                const itemData = encodeURIComponent(JSON.stringify(item));
                table += `<tr>
                    <td>${item.ID_ATIVO}</td>
                    <td>${item.DESCRICAO}</td>
                    <td>${item.NUMERO_SERIE || '-'}</td>
                    <td><span class="badge">${item.STATUS_NOME || item.STATUS || '-'}</span></td>
                    <td>${item.PROPRIETARIO || '-'}</td>
                    <td>
                        <button class="btn-icon" onclick="appManager.openAssetModal('${itemData}')">✏️</button>
                        <button class="btn-icon" onclick="appManager.deleteAsset(${item.ID_ATIVO})">🗑️</button>
                    </td>
                </tr>`;
            });
        }

        table += '</tbody></table></div></div>';
        contentArea.innerHTML = table;
    }

    async loadUsers() {
        try {
            const response = await fetch('api/usuarios');
            if (!response.ok) throw new Error('Erro ao carregar usuários');
            const data = await response.json();
            this.renderUsers(data);
        } catch (error) {
            console.error(error);
            this.showError('Erro ao carregar usuários', error.message);
        }
    }

    // --- USERS CRUD ---

    async openUserModal(userData = null) {
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        const form = document.getElementById('userForm');
        form.reset();
        document.getElementById('userId').value = '';
        await this.loadDropdowns();

        if (userData) {
            const user = JSON.parse(decodeURIComponent(userData));
            title.textContent = 'Editar Usuário';
            document.getElementById('userId').value = user.ID_USUARIO;
            document.getElementById('userName').value = user.NOME;
            document.getElementById('userEmail').value = user.EMAIL;
            document.getElementById('userProfile').value = user.ID_PERFIL;
        } else {
            title.textContent = 'Novo Usuário';
        }
        modal.classList.add('active');
    }

    async saveUser() {
        const id = document.getElementById('userId').value;
        const data = {
            NOME: document.getElementById('userName').value,
            EMAIL: document.getElementById('userEmail').value,
            ID_PERFIL: document.getElementById('userProfile').value,
            SENHA: document.getElementById('userPassword').value
        };

        if (!data.NOME || !data.EMAIL || !data.ID_PERFIL) {
            alert('Preencha os campos obrigatórios!');
            return;
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `api/usuarios/${id}` : 'api/usuarios';
            const result = await (await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json();
            if (!result.success && !result.id) throw new Error(result.error);
            this.closeModal('userModal');
            this.loadUsers();
        } catch (e) { alert(e.message); }
    }

    async deleteUser(id) {
        if (!confirm('Excluir usuário?')) return;
        await fetch(`api/usuarios/${id}`, { method: 'DELETE' });
        this.loadUsers();
    }

    renderUsers(data) {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="header-actions">
                <h2>Gestão de Acesso</h2>
            </div>
            <div class="card" style="margin-top: 20px;">
                <div class="tab-nav">
                    <button id="btn-tab-users" class="tab-btn active" onclick="appManager.switchUserTab('users')">Usuários</button>
                    <button id="btn-tab-perfis" class="tab-btn" onclick="appManager.switchUserTab('perfis')">Perfis e Direitos</button>
                </div>
                
                <div id="tab-users-content" class="tab-content active">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                        <h3>Lista de Usuários</h3>
                        <button class="btn-primary" onclick="appManager.openUserModal()">Novo Usuário</button>
                    </div>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th><th>Nome</th><th>Email</th><th>Perfil</th><th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(item => {
            const itemData = encodeURIComponent(JSON.stringify(item));
            return `<tr>
                                        <td>${item.ID_USUARIO}</td>
                                        <td>${item.NOME}</td>
                                        <td>${item.EMAIL}</td>
                                        <td>${item.PERFIL || '-'}</td>
                                        <td>
                                            <button class="btn-icon" onclick="appManager.openUserModal('${itemData}')">✏️</button>
                                            <button class="btn-icon" onclick="appManager.deleteUser(${item.ID_USUARIO})">🗑️</button>
                                        </td>
                                    </tr>`;
        }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div id="tab-perfis-content" class="tab-content">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                        <h3>Perfis de Acesso</h3>
                        <button class="btn-primary" onclick="appManager.openPerfilModal()">Novo Perfil</button>
                    </div>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th><th>Nome</th><th>Direitos Habilitados</th><th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="perfisTableBody">
                                <tr><td colspan="4">Carregando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    switchUserTab(tab) {
        const usersContent = document.getElementById('tab-users-content');
        const perfisContent = document.getElementById('tab-perfis-content');
        const btnUsers = document.getElementById('btn-tab-users');
        const btnPerfis = document.getElementById('btn-tab-perfis');

        if (tab === 'users') {
            usersContent.classList.add('active');
            perfisContent.classList.remove('active');
            btnUsers.classList.add('active');
            btnPerfis.classList.remove('active');
        } else {
            usersContent.classList.remove('active');
            perfisContent.classList.add('active');
            btnUsers.classList.remove('active');
            btnPerfis.classList.add('active');
            this.loadPerfis();
        }
    }

    async loadPerfis() {
        const tbody = document.getElementById('perfisTableBody');
        try {
            const res = await fetch('api/perfis');
            const data = await res.json();
            this.perfisData = data;

            tbody.innerHTML = data.map(p => {
                const pData = encodeURIComponent(JSON.stringify(p));
                // Count enabled permissions
                const perms = Object.keys(p).filter(key => key.startsWith('CAN_') && p[key] === 1).length;

                return `
                    <tr>
                        <td>${p.ID_PERFIL}</td>
                        <td><strong>${p.NOME}</strong></td>
                        <td><span class="badge" style="background:var(--secondary-color)">${perms} módulos</span></td>
                        <td>
                            <button class="btn-icon" onclick="appManager.openPerfilModal('${pData}')">✏️</button>
                            <button class="btn-icon" onclick="appManager.deletePerfil(${p.ID_PERFIL})">🗑️</button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar perfis.</td></tr>';
        }
    }

    openPerfilModal(perfilData = null) {
        const modal = document.getElementById('perfilModal');
        const form = document.getElementById('perfilForm');
        const title = document.getElementById('perfilModalTitle');

        form.reset();
        document.getElementById('perfilId').value = '';

        // Reset permissions to checked by default
        const checkboxes = document.querySelectorAll('#perfilForm input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);

        if (perfilData) {
            const p = JSON.parse(decodeURIComponent(perfilData));
            title.textContent = 'Editar Perfil';
            document.getElementById('perfilId').value = p.ID_PERFIL;
            document.getElementById('perfilName').value = p.NOME;

            checkboxes.forEach(cb => {
                const key = cb.id.replace('perm_', '');
                cb.checked = p[key] === 1;
            });
        } else {
            title.textContent = 'Novo Perfil';
        }
        modal.classList.add('active');
    }

    async savePerfil() {
        const id = document.getElementById('perfilId').value;
        const NOME = document.getElementById('perfilName').value;
        if (!NOME) return alert('Nome é obrigatório');

        const data = { NOME };
        const checkboxes = document.querySelectorAll('#perfilForm input[type="checkbox"]');
        checkboxes.forEach(cb => {
            const key = cb.id.replace('perm_', '');
            data[key] = cb.checked ? 1 : 0;
        });

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `api/perfis/${id}` : 'api/perfis';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                this.closeModal('perfilModal');
                this.loadPerfis();
                alert('Perfil salvo com sucesso!');
            } else {
                alert('Erro ao salvar perfil.');
            }
        } catch (e) {
            alert('Erro: ' + e.message);
        }
    }

    async deletePerfil(id) {
        if (!confirm('Excluir este perfil? Usuários vinculados podem perder acesso.')) return;
        try {
            const res = await fetch(`api/perfis/${id}`, { method: 'DELETE' });
            if (res.ok) {
                this.loadPerfis();
            } else {
                alert('Erro ao excluir perfil. Verifique se existem usuários vinculados.');
            }
        } catch (e) {
            alert('Erro: ' + e.message);
        }
    }

    // --- CHAMADOS CRUD ---
    async loadChamados() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = document.getElementById('chamados-view').innerHTML;
        this.switchChamadosTab('metrics');
    }

    switchChamadosTab(tab) {
        const metricsContent = document.getElementById('tab-chamados-metrics-content');
        const listContent = document.getElementById('tab-chamados-list-content');
        const btnMetrics = document.getElementById('btn-tab-chamados-metrics');
        const btnList = document.getElementById('btn-tab-chamados-list');

        if (!metricsContent || !listContent) return;

        if (tab === 'metrics') {
            metricsContent.classList.add('active');
            listContent.classList.remove('active');
            btnMetrics.classList.add('active');
            btnList.classList.remove('active');
            this.loadChamadosDashboard();
        } else {
            metricsContent.classList.remove('active');
            listContent.classList.add('active');
            btnMetrics.classList.remove('active');
            btnList.classList.add('active');
            this.loadChamadosList();
        }
    }

    async loadChamadosDashboard() {
        const kpiGrid = document.getElementById('chamados-kpi-grid');
        const vencimentoMesTable = document.getElementById('vencimentoMesTableBody');
        const slaTable = document.getElementById('contratosSLATableBody');

        try {
            const res = await fetch('api/chamados/dashboard');
            if (!res.ok) throw new Error('Erro ao buscar dados do dashboard');
            const data = await res.json();

            const ativosStatus = data.ativosStatus || [];
            const locados = ativosStatus.find(s => s.STATUS === 'Locado')?.QTD || 0;
            const estoque = ativosStatus.find(s => s.STATUS === 'Estoque')?.QTD || 0;
            const manutencao = ativosStatus.find(s => (s.STATUS || '').includes('Manutenção'))?.QTD || 0;

            if (kpiGrid) {
                kpiGrid.innerHTML = `
                    <div class="kpi-card" style="border-left: 4px solid var(--primary-color)">
                        <div class="kpi-title">Chamados Totais</div>
                        <div class="kpi-value">${data.totalChamados || 0}</div>
                    </div>
                    <div class="kpi-card" style="border-left: 4px solid var(--secondary-color)">
                        <div class="kpi-title">Contratos Ativos</div>
                        <div class="kpi-value">${data.contratosAtivos || 0} <small style="font-size:0.5em; opacity:0.6">/ ${data.totalContratos || 0}</small></div>
                    </div>
                    <div class="kpi-card" style="border-left: 4px solid #4f46e5">
                        <div class="kpi-title">Equip. Locados</div>
                        <div class="kpi-value">${locados}</div>
                    </div>
                     <div class="kpi-card" style="border-left: 4px solid #f59e0b">
                        <div class="kpi-title">Estoque / Manutenção</div>
                        <div class="kpi-value">${estoque} <small style="font-size:0.5em; opacity:0.6">/</small> ${manutencao}</div>
                    </div>
                `;
            }

            if (vencimentoMesTable) {
                vencimentoMesTable.innerHTML = data.vencimentoMes && data.vencimentoMes.length > 0
                    ? data.vencimentoMes.map(c => `
                        <tr>
                            <td><strong>${c.DESCRICAO || 'S/D'}</strong></td>
                            <td>${c.CLIENTE_NOME || '-'}</td>
                            <td style="color:#f59e0b; font-weight:bold">${new Date(c.DATA_FIM).toLocaleDateString('pt-BR')}</td>
                        </tr>
                    `).join('')
                    : '<tr><td colspan="3" style="text-align:center; padding: 20px;">Nenhum contrato vencendo este mês.</td></tr>';
            }

            if (slaTable) {
                slaTable.innerHTML = data.contratosSLA && data.contratosSLA.length > 0
                    ? data.contratosSLA.map(s => `
                        <tr>
                            <td>${s.SLDESC || 'Sem SLA'}</td>
                            <td><span class="badge" style="background:var(--primary-color)">${s.QTD} contratos</span></td>
                        </tr>
                    `).join('')
                    : '<tr><td colspan="2" style="text-align:center; padding: 20px;">Nenhum dado de SLA.</td></tr>';
            }
        } catch (e) { console.error(e); }
    }

    async loadChamadosList() {
        const response = await fetch('api/chamados');
        const data = await response.json();
        this.renderChamados(data);
    }

    async openChamadoModal(chamadoData = null) {
        const modal = document.getElementById('chamadoModal');
        const title = document.getElementById('chamadoModalTitle');
        const form = document.getElementById('chamadoForm');

        form.reset();
        document.getElementById('chamadoId').value = '';

        // Load Options
        try {
            const [clientsRes, slaRes, statusRes, ativoRes, contatoRes, tecnicoRes] = await Promise.all([
                fetch('api/clientes'),
                fetch('api/sla'),
                fetch('api/status'),
                fetch('api/ativos'),
                fetch('api/contatos'),
                fetch('api/tecnicos')
            ]);
            const clients = await clientsRes.json();
            const slas = await slaRes.json();
            const statuses = await statusRes.json();
            const ativos = await ativoRes.json();
            const contatos = contatoRes.ok ? await contatoRes.json() : [];
            const tecnicos = tecnicoRes.ok ? await tecnicoRes.json() : [];

            const clientSelect = document.getElementById('chamadoClient');
            clientSelect.innerHTML = '<option value="">Selecione um Cliente...</option>' +
                clients.map(c => `<option value="${c.ID_CLIENTE}">${c.NOME_RAZAO}</option>`).join('');

            const slaSelect = document.getElementById('chamadoSLA');
            slaSelect.innerHTML = '<option value="">Selecione o SLA...</option>' +
                slas.map(s => `<option value="${s.ID_SLA}">${s.SLDESC}</option>`).join('');

            const statusSelect = document.getElementById('chamadoStatus');
            statusSelect.innerHTML = '<option value="">Selecione o Status...</option>' +
                statuses.map(s => `<option value="${s.ID_STATUS}">${s.STATUS}</option>`).join('');

            const ativoSelect = document.getElementById('chamadoAtivo');
            ativoSelect.innerHTML = '<option value="">Nenhum Ativo Vinculado</option>' +
                ativos.map(a => `<option value="${a.ID_ATIVO}">${a.DESCRICAO} (${a.NUMERO_SERIE || 'S/N'})</option>`).join('');

            const contatoSelect = document.getElementById('chamadoContato');
            contatoSelect.innerHTML = '<option value="">Nenhum Contato Vinculado</option>' +
                contatos.map(c => `<option value="${c.ID_CONTATO}">${c.NOME_CONTATO}</option>`).join('');

            const tecnicoSelect = document.getElementById('chamadoTecnico');
            tecnicoSelect.innerHTML = '<option value="">Nenhum Técnico Vinculado</option>' +
                tecnicos.map(t => `<option value="${t.ID_TECNICO}">${t.NOME}</option>`).join('');

        } catch (e) {
            console.error("Error loading options for Chamado Modal:", e);
        }

        if (chamadoData) {
            const chamado = JSON.parse(decodeURIComponent(chamadoData));
            title.textContent = 'Editar Chamado';
            document.getElementById('chamadoId').value = chamado.ID_CHAMADO;
            document.getElementById('chamadoClient').value = chamado.CODCLIENTE || '';
            document.getElementById('chamadoSerie').value = chamado.NUMERO_SERIE || '';
            document.getElementById('chamadoSLA').value = chamado.SLAID || '';
            document.getElementById('chamadoDescricao').value = chamado.DESCRICAO || '';
            document.getElementById('chamadoUrgencia').value = chamado.URGENCIA || 'medium';
            document.getElementById('chamadoStatus').value = chamado.ID_STATUS || 1;
            document.getElementById('chamadoAtivo').value = chamado.ID_ATIVO || '';
            document.getElementById('chamadoContato').value = chamado.ID_CONTATO || '';
            document.getElementById('chamadoTecnico').value = chamado.ID_TECNICO || '';
        } else {
            title.textContent = 'Novo Chamado';
            document.getElementById('chamadoStatus').value = 1;
            document.getElementById('chamadoUrgencia').value = 'medium';
            document.getElementById('chamadoDescricao').value = '';
        }
        modal.classList.add('active');
    }

    async saveChamado() {
        const id = document.getElementById('chamadoId').value;
        const data = {
            CODCLIENTE: document.getElementById('chamadoClient').value,
            NUMERO_SERIE: document.getElementById('chamadoSerie').value,
            SLAID: document.getElementById('chamadoSLA').value || null,
            DESCRICAO: document.getElementById('chamadoDescricao').value,
            URGENCIA: document.getElementById('chamadoUrgencia').value,
            ID_STATUS: document.getElementById('chamadoStatus').value || 1,
            ID_ATIVO: document.getElementById('chamadoAtivo').value || null,
            ID_CONTATO: document.getElementById('chamadoContato').value || null,
            ID_TECNICO: document.getElementById('chamadoTecnico').value || null
        };

        if (!data.CODCLIENTE || !data.DESCRICAO) {
            alert('Preencha pelo menos o Cliente e a Descrição!');
            return;
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `api/chamados/${id}` : 'api/chamados';
            const result = await (await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json();
            if (!result.success) throw new Error(result.error || 'Erro ao salvar chamado');
            this.closeModal('chamadoModal');
            this.loadChamados();
        } catch (e) { alert(e.message); }
    }

    async deleteChamado(id) {
        if (!confirm('Excluir chamado?')) return;
        await fetch(`api/chamados/${id}`, { method: 'DELETE' });
        this.loadChamados();
    }

    renderChamados(data) {
        const tbody = document.getElementById('chamadosTableBody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 1rem;">Nenhum chamado encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(item => {
            const dataStr = encodeURIComponent(JSON.stringify(item));
            const dataHora = item.DATA_HORA ? new Date(item.DATA_HORA).toLocaleString('pt-BR') : '-';

            let urgLabel = 'Média';
            let urgColor = '#f59e0b';
            if (item.URGENCIA === 'low') { urgLabel = 'Baixa'; urgColor = '#10b981'; }
            if (item.URGENCIA === 'high') { urgLabel = 'Alta'; urgColor = '#ef4444'; }

            let statusColor = 'var(--primary-color)';
            if (item.STATUS_NOME === 'Concluído') statusColor = '#10b981';
            if (item.STATUS_NOME === 'Aberto') statusColor = '#ef4444';
            if (item.STATUS_NOME === 'Em Atendimento') statusColor = '#f59e0b';

            return `
                <tr>
                    <td><strong>${item.TICKETID || '-'}</strong></td>
                    <td>${item.CLIENTE_NOME || '-'}</td>
                    <td>${item.ATIVO_NOME || '-'}</td>
                    <td>${item.NUMERO_SERIE || '-'}</td>
                    <td>${dataHora}</td>
                    <td><span class="badge" style="background:#4f46e5">${item.SLA_DESC || '-'}</span></td>
                    <td><span class="badge" style="background:${statusColor}">${item.STATUS_NOME || 'Aberto'}</span></td>
                    <td><span class="badge" style="background:${urgColor}">${urgLabel}</span></td>
                    <td>
                        <button class="btn-icon" onclick="appManager.openChamadoModal('${dataStr}')">✏️</button>
                        <button class="btn-icon" onclick="appManager.deleteChamado(${item.ID_CHAMADO})">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Helper methods to reduce duplication
    renderTable(title, headers, rows) {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            < div class="card" >
                <div class="card-header">
                    <h2>${title}</h2>
                    <button class="btn-primary">Novo ${title.slice(0, -1)}</button>
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div >
            `;
    }

    showError(title, message) {
        document.getElementById('content-area').innerHTML = `
            < div class="error-message" >
                <h3>${title}</h3>
                <p>${message}</p>
            </div > `;
    }

    showEmpty(message, title) {
        document.getElementById('content-area').innerHTML = `
            < div class="card" >
                <div class="card-header"><h2>${title}</h2></div>
                <p>${message}</p>
            </div > `;
    }

    async loadContracts() {
        try {
            const response = await fetch('api/contratos');
            if (!response.ok) throw new Error('Erro ao carregar contratos');
            this.contractsData = await response.json();

            // Apply filtering if we have data
            if (!this.clientsData) {
                this.clientsData = await (await fetch('api/clientes')).json();
            }

            // Init Filter State
            this.contractFilterClient = '';
            this.contractFilterStart = '';
            this.contractFilterEnd = '';
            this.contractFilterStatus = 'Todos';

            this.renderContracts(this.contractsData);
        } catch (error) {
            console.error(error);
            document.getElementById('content-area').innerHTML = `
            < div class="error-message" >
                    <h3>Erro ao carregar contratos</h3>
                    <p>${error.message}</p>
                </div > `;
        }
    }

    filterContracts() {
        const client = this.contractFilterClient;
        const start = this.contractFilterStart;
        const end = this.contractFilterEnd;
        const status = this.contractFilterStatus;

        const filtered = this.contractsData.filter(item => {
            // Client
            if (client && item.ID_CLIENTE != client) return false;

            // Period (Start Date)
            if (start || end) {
                const itemDate = new Date(item.DATA_INICIO);
                if (start && itemDate < new Date(start)) return false;
                if (end && itemDate > new Date(end)) return false;
            }

            // Status
            if (status !== 'Todos') {
                const s = (item.STATUS_NOME || item.STATUS || '').toLowerCase();
                if (s !== status.toLowerCase()) return false;
            }

            return true;
        });
        this.renderContracts(filtered, false);
    }

    renderContracts(data, resetFilters = true) {
        const contentArea = document.getElementById('content-area');

        // Optimization: check existing body
        const existingTbody = document.getElementById('contractsTableBody');
        if (existingTbody) {
            if (data.length === 0) {
                existingTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 1rem;">Nenhum contrato encontrado.</td></tr>';
            } else {
                let rows = '';
                data.forEach(item => {
                    const valor = item.VALOR_MENSAL ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.VALOR_MENSAL) : '-';
                    const dataInicio = item.DATA_INICIO ? new Date(item.DATA_INICIO).toLocaleDateString() : '-';
                    const dataFim = item.DATA_FIM ? new Date(item.DATA_FIM).toLocaleDateString() : '-';
                    const contractData = encodeURIComponent(JSON.stringify(item));

                    rows += `
            < tr >
                            <td>${item.ID_CONTRATO}</td>
                            <td>${item.NOME_RAZAO || 'N/A'}</td>
                            <td>${item.DESCRICAO || '-'}</td>
                            <td>${dataInicio}</td>
                            <td>${dataFim}</td>
                            <td>${valor}</td>
                            <td><span class="badge">${item.STATUS_NOME || item.STATUS || '-'}</span></td>
                            <td><span class="badge">${item.SLA_NOME || '-'}</span></td>
                            <td>
                                <button class="btn-icon" onclick="appManager.openContractModal('${contractData}')">✏️</button>
                                <button class="btn-icon" onclick="appManager.deleteContract(${item.ID_CONTRATO})">🗑️</button>
                            </td>
                        </tr >
            `;
                });
                existingTbody.innerHTML = rows;
            }

            // Update Status Buttons Active State
            const buttons = contentArea.querySelectorAll('.btn-group .btn-sm');
            buttons.forEach(btn => {
                const isSelected = btn.textContent.trim() === this.contractFilterStatus;
                if (isSelected) btn.classList.add('active');
                else btn.classList.remove('active');
            });

            return;
        }

        // Build Client Options
        let clientOptions = '<option value="">Todos os Clientes</option>';
        if (this.clientsData) {
            this.clientsData.forEach(c => {
                clientOptions += `< option value = "${c.ID_CLIENTE}" ${this.contractFilterClient == c.ID_CLIENTE ? 'selected' : ''}> ${c.NOME_RAZAO}</option > `;
            });
        }

        // Header with Filters
        const header = `
            < div class="card" >
                <div class="card-header" style="flex-wrap: wrap; gap: 10px;">
                    <h2>Contratos</h2>
                    <div class="header-actions" style="flex-wrap: wrap; align-items: center; gap: 5px;">

                        <!-- Client Filter -->
                        <select class="form-control" style="width: 180px;" onchange="appManager.contractFilterClient = this.value; appManager.filterContracts()">
                            ${clientOptions}
                        </select>

                        <!-- Period Filter -->
                        <div style="display: flex; gap: 5px; align-items: center;">
                            <input type="date" class="form-control" style="width: 130px;" title="Data Início"
                                value="${this.contractFilterStart}" onchange="appManager.contractFilterStart = this.value; appManager.filterContracts()">
                                <span>a</span>
                                <input type="date" class="form-control" style="width: 130px;" title="Data Fim"
                                    value="${this.contractFilterEnd}" onchange="appManager.contractFilterEnd = this.value; appManager.filterContracts()">
                                </div>

                                <!-- Status Filter -->
                                <div class="btn-group">
                                    <button class="btn-sm ${this.contractFilterStatus === 'Todos' ? 'active' : ''}" onclick="appManager.contractFilterStatus='Todos'; appManager.filterContracts()">Todos</button>
                                    <button class="btn-sm ${this.contractFilterStatus === 'Ativo' ? 'active' : ''}" onclick="appManager.contractFilterStatus='Ativo'; appManager.filterContracts()">Ativo</button>
                                    <button class="btn-sm ${this.contractFilterStatus === 'Inativo' ? 'active' : ''}" onclick="appManager.contractFilterStatus='Inativo'; appManager.filterContracts()">Inativo</button>
                                </div>

                                <button class="btn-primary" onclick="appManager.openContractModal()">Novo Contrato</button>
                        </div>
                    </div>`;

        let tableHtml = header + `
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Cliente</th>
                                    <th>Descrição</th>
                                    <th>Data Início</th>
                                    <th>Data Fim</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="contractsTableBody">
                                `;

        if (data.length === 0) {
            tableHtml += '<tr><td colspan="8" style="text-align:center; padding: 1rem;">Nenhum contrato encontrado.</td></tr>';
        } else {
            data.forEach(item => {
                const valor = item.VALOR_MENSAL ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.VALOR_MENSAL) : '-';
                const dataInicio = item.DATA_INICIO ? new Date(item.DATA_INICIO).toLocaleDateString() : '-';
                const dataFim = item.DATA_FIM ? new Date(item.DATA_FIM).toLocaleDateString() : '-';
                const contractData = encodeURIComponent(JSON.stringify(item));

                tableHtml += `
                    <tr>
                        <td>${item.ID_CONTRATO}</td>
                        <td>${item.NOME_RAZAO || 'N/A'}</td>
                        <td>${item.DESCRICAO || '-'}</td>
                        <td>${dataInicio}</td>
                        <td>${dataFim}</td>
                        <td>${valor}</td>
                        <td><span class="badge">${item.STATUS_NOME || item.STATUS || '-'}</span></td>
                        <td>
                            <button class="btn-icon" onclick="appManager.openContractModal('${contractData}')">✏️</button>
                            <button class="btn-icon" onclick="appManager.deleteContract(${item.ID_CONTRATO})">🗑️</button>
                        </td>
                    </tr>
                `;
            });
        }

        tableHtml += '</tbody></table></div></div>';
        contentArea.innerHTML = tableHtml;
    }

    async loadDashboard() {
        try {
            // Fetch all required data in parallel
            const [clients, agenda, contracts, assets] = await Promise.all([
                fetch('api/clientes').then(r => r.json()),
                fetch('api/agendamentos').then(r => r.json()),
                fetch('api/contratos').then(r => r.json()),
                fetch('api/ativos').then(r => r.json())
            ]);

            this.dashboardDataStore = { clients, agenda, contracts, assets }; // Store for drill-down
            this.agendaData = agenda; // Store for Edit Modal
            this.renderDashboard(this.dashboardDataStore);

        } catch (error) {
            console.error("Dashboard Load Error:", error);
            this.showError('Erro ao carregar Dashboard', error.message);
        }
    }

    renderDashboard(data) {
        const contentArea = document.getElementById('content-area');

        // --- Metrics Calculations ---

        // 1. Clients
        const totalClients = data.clients.length;

        // 2. Contracts & MRR
        const activeContracts = data.contracts.filter(c => (c.STATUS_NOME || c.STATUS) === 'Ativo');
        const countActiveContracts = activeContracts.length;
        // MRR: Sum of VALOR_MENSAL for active contracts
        const mrr = activeContracts.reduce((sum, c) => sum + (parseFloat(c.VALOR_MENSAL) || 0), 0);
        const formattedMrr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrr);

        // 3. Assets
        const leasedAssets = data.assets.filter(a => (a.STATUS_NOME || a.STATUS || '').toLowerCase().includes('locado'));
        const countLeasedAssets = leasedAssets.length;
        const totalAssets = data.assets.length;

        // Asset Chart Data
        const assetsLocado = countLeasedAssets;
        const assetsMaintenance = data.assets.filter(a => (a.STATUS_NOME || a.STATUS || '').toLowerCase().includes('manutenção')).length;
        const assetsStock = totalAssets - assetsLocado - assetsMaintenance;

        // --- Reminders Logic (Next 5 Days) ---
        const today = new Date();
        const limitDate = new Date();
        limitDate.setDate(today.getDate() + 5);

        const reminders = data.agenda.filter(item => {
            if ((item.STATUS_NOME || '').toLowerCase().includes('encerrado')) return false;

            const dr = item.DATA_RETIRADA ? new Date(item.DATA_RETIRADA) : null;
            const dp = item.DATA_DEVOLUCAO_PREVISTA ? new Date(item.DATA_DEVOLUCAO_PREVISTA) : null;

            // Check if Retirada is upcoming
            const isRetiradaCheck = dr && dr >= today && dr <= limitDate;
            // Check if Devolucao is upcoming
            const isDevolucaoCheck = dp && dp >= today && dp <= limitDate;

            if (isRetiradaCheck) item._reminderType = 'retirada';
            else if (isDevolucaoCheck) item._reminderType = 'devolucao';

            return isRetiradaCheck || isDevolucaoCheck;
        }).sort((a, b) => {
            const dateA = a._reminderType === 'retirada' ? new Date(a.DATA_RETIRADA) : new Date(a.DATA_DEVOLUCAO_PREVISTA);
            const dateB = b._reminderType === 'retirada' ? new Date(b.DATA_RETIRADA) : new Date(b.DATA_DEVOLUCAO_PREVISTA);
            return dateA - dateB;
        });


        // --- HTML Structure ---
        contentArea.innerHTML = `
            <h2>Dashboard</h2>
            
            <div class="dashboard-grid">
                
                <!-- MAIN COLUMN (KPIs + Charts) -->
                <div class="dashboard-main">
                    
                    <!-- KPI Grid -->
                    <div class="kpi-grid">
                        <!-- Card 1: Clientes -->
                        <div class="kpi-card" onclick="appManager.openDashboardDetail('clients')">
                            <div class="kpi-title">Total de Clientes</div>
                            <div class="kpi-value">${totalClients}</div>
                            <div class="kpi-trend">👥 Ativos na base</div>
                        </div>

                        <!-- Card 2: Contratos -->
                        <div class="kpi-card" onclick="appManager.openDashboardDetail('contracts')">
                            <div class="kpi-title">Contratos Ativos</div>
                            <div class="kpi-value">${countActiveContracts}</div>
                            <div class="kpi-trend">📄 Em vigência</div>
                        </div>

                         <!-- Card 3: MRR -->
                        <div class="kpi-card" onclick="appManager.openDashboardDetail('mrr')">
                            <div class="kpi-title">Receita Mensal</div>
                            <div class="kpi-value" style="color:var(--success-color)">${formattedMrr}</div>
                            <div class="kpi-trend">💰 Recorrente</div>
                        </div>

                         <!-- Card 4: Assets -->
                        <div class="kpi-card" onclick="appManager.openDashboardDetail('assets')">
                            <div class="kpi-title">Ativos em Uso</div>
                            <div class="kpi-value">${countLeasedAssets}</div>
                            <div class="kpi-trend">📦 Locados (${Math.round((countLeasedAssets / totalAssets) * 100 || 0)}%)</div>
                        </div>
                    </div>

                    <!-- Charts Row -->
                    <div class="charts-row">
                        <div class="chart-card">
                            <h3>Status dos Contratos</h3>
                            <div style="flex:1; position:relative;">
                                <canvas id="contractsChart"></canvas>
                            </div>
                        </div>
                        <div class="chart-card">
                            <h3>Distribuição de Ativos</h3>
                            <div style="flex:1; position:relative;">
                                <canvas id="assetsChart"></canvas>
                            </div>
                            <div style="text-align:center; margin-top:10px; display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
                                <span class="badge" style="background:#3b82f6; cursor:pointer;" onclick="appManager.openDashboardDetail('assets_locado')">Locados: ${assetsLocado}</span>
                                <span class="badge" style="background:#f97316; cursor:pointer;" onclick="appManager.openDashboardDetail('assets_manutencao')">Manutenção: ${assetsMaintenance}</span>
                                <span class="badge" style="background:#6b7280; cursor:pointer;" onclick="appManager.openDashboardDetail('assets_estoque')">Estoque: ${assetsStock}</span>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- SIDEBAR column (Reminders) -->
                <div class="dashboard-sidebar">
                    <div class="sidebar-title">Próximos 5 Dias 📅</div>
                    <div class="reminder-list">
                        ${reminders.length > 0 ? reminders.map(r => {
            const typeLabel = r._reminderType === 'retirada' ? 'Retirada' : 'Devolução';
            const dateObj = r._reminderType === 'retirada' ? new Date(r.DATA_RETIRADA) : new Date(r.DATA_DEVOLUCAO_PREVISTA);
            const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

            return `
                                <div class="reminder-card ${r._reminderType}" style="position: relative; cursor: pointer;" onclick="appManager.openAgendaModal(${r.ID_AGENDA})">
                                    <div class="reminder-date">
                                        <span>${dateStr}</span>
                                        <span style="font-size:0.75rem; opacity:0.8">${typeLabel}</span>
                                    </div>
                                    <div class="reminder-client">${r.CLIENTE_NOME || 'Cliente'}</div>
                                    <div class="reminder-asset">${r.ATIVO_DESC || 'Equipamento'}</div>
                                    
                                    <button class="btn-icon" style="position: absolute; bottom: 10px; right: 10px; background: rgba(255,255,255,0.8); z-index: 2;" 
                                        onclick="event.stopPropagation(); appManager.printAppointment(${r.ID_AGENDA});" title="Imprimir Relatório">
                                        🖨️
                                    </button>
                                </div>
                            `;
        }).join('') : '<p style="color:var(--text-secondary); text-align:center;">Nenhum agendamento próximo.</p>'}
                    </div>
                </div>

            </div>
        `;

        // --- Render Charts ---

        // 1. Contracts Doughnut
        const ctxContracts = document.getElementById('contractsChart').getContext('2d');
        const inactiveContracts = data.contracts.length - countActiveContracts;
        new Chart(ctxContracts, {
            type: 'doughnut',
            data: {
                labels: ['Ativos', 'Inativos'],
                datasets: [{
                    data: [countActiveContracts, inactiveContracts],
                    backgroundColor: ['#10b981', '#334155'], // Green, Gray
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: { cutout: '65%', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }
        });

        // 2. Assets Bar
        const ctxAssets = document.getElementById('assetsChart').getContext('2d');
        new Chart(ctxAssets, {
            type: 'bar',
            data: {
                labels: ['Locado', 'Estoque', 'Manutenção'],
                datasets: [{
                    label: 'Quantidade',
                    data: [assetsLocado, assetsStock, assetsMaintenance],
                    backgroundColor: ['#3b82f6', '#6b7280', '#f97316'],
                    borderRadius: 6,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#ffffff10' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }

    openDashboardDetail(type) {
        const modal = document.getElementById('dashboardDetailModal');
        const title = document.getElementById('detailModalTitle');
        const thead = document.getElementById('detailModalThead');
        const tbody = document.getElementById('detailModalTbody');
        const data = this.dashboardDataStore;

        if (!data) return;

        let headers = [];
        let rows = '';

        if (type === 'clients') {
            title.textContent = 'Detalhes: Clientes';
            headers = ['Nome', 'Email', 'Telefone'];
            rows = data.clients.map(c => `<tr><td>${c.NOME_RAZAO}</td><td>${c.EMAIL || '-'}</td><td>${c.TELEFONE || '-'}</td></tr>`).join('');
        } else if (type === 'contracts') {
            title.textContent = 'Detalhes: Contratos Ativos';
            headers = ['Cliente', 'Descrição', 'Valor Mensal'];
            rows = data.contracts.filter(c => (c.STATUS_NOME || c.STATUS) === 'Ativo')
                .map(c => `<tr><td>${c.NOME_RAZAO}</td><td>${c.DESCRICAO}</td><td>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.VALOR_MENSAL || 0)}</td></tr>`).join('');
        } else if (type === 'mrr') {
            title.textContent = 'Detalhamento de Receita (MRR)';
            headers = ['Contrato ID', 'Cliente', 'Valor'];
            rows = data.contracts.filter(c => (c.STATUS_NOME || c.STATUS) === 'Ativo')
                .sort((a, b) => (b.VALOR_MENSAL || 0) - (a.VALOR_MENSAL || 0))
                .map(c => `<tr><td>${c.ID_CONTRATO}</td><td>${c.NOME_RAZAO}</td><td>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.VALOR_MENSAL || 0)}</td></tr>`).join('');
        } else if (type === 'assets' || type === 'assets_locado') {
            title.textContent = 'Ativos Locados (Em Uso)';
            headers = ['Descrição', 'Série', 'Proprietário', 'Ações'];
            rows = data.assets.filter(a => (a.STATUS_NOME || a.STATUS || '').toLowerCase().includes('locado'))
                .map(a => {
                    const itemData = encodeURIComponent(JSON.stringify(a));
                    return `<tr>
                        <td>${a.DESCRICAO}</td>
                        <td>${a.NUMERO_SERIE || '-'}</td>
                        <td>${a.PROPRIETARIO || '-'}</td>
                        <td>
                             <button class="btn-icon" onclick="appManager.openAssetModal('${itemData}')">✏️</button>
                             <button class="btn-icon" onclick="appManager.deleteAsset(${a.ID_ATIVO})">🗑️</button>
                        </td>
                    </tr>`;
                }).join('');
        } else if (type === 'assets_manutencao') {
            title.textContent = 'Ativos em Manutenção';
            headers = ['Descrição', 'Série', 'Proprietário', 'Ações'];
            rows = data.assets.filter(a => (a.STATUS_NOME || a.STATUS || '').toLowerCase().includes('manutenção'))
                .map(a => {
                    const itemData = encodeURIComponent(JSON.stringify(a));
                    return `<tr>
                        <td>${a.DESCRICAO}</td>
                        <td>${a.NUMERO_SERIE || '-'}</td>
                        <td>${a.PROPRIETARIO || '-'}</td>
                        <td>
                             <button class="btn-icon" onclick="appManager.openAssetModal('${itemData}')">✏️</button>
                             <button class="btn-icon" onclick="appManager.deleteAsset(${a.ID_ATIVO})">🗑️</button>
                        </td>
                    </tr>`;
                }).join('');
        } else if (type === 'assets_estoque') {
            title.textContent = 'Ativos em Estoque';
            headers = ['Descrição', 'Série', 'Proprietário', 'Ações'];
            rows = data.assets.filter(a => {
                const s = (a.STATUS_NOME || a.STATUS || '').toLowerCase();
                return s.includes('estoque') || s.includes('disponivel') || s.includes('disponível');
            }).map(a => {
                const itemData = encodeURIComponent(JSON.stringify(a));
                return `<tr>
                        <td>${a.DESCRICAO}</td>
                        <td>${a.NUMERO_SERIE || '-'}</td>
                        <td>${a.PROPRIETARIO || '-'}</td>
                        <td>
                             <button class="btn-icon" onclick="appManager.openAssetModal('${itemData}')">✏️</button>
                             <button class="btn-icon" onclick="appManager.deleteAsset(${a.ID_ATIVO})">🗑️</button>
                        </td>
                    </tr>`;
            }).join('');
        }

        thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
        tbody.innerHTML = rows;
        modal.classList.add('active');
    }

    printAppointment(id) {
        const item = this.agendaData ? this.agendaData.find(i => i.ID_AGENDA == id) : null;
        if (!item) {
            alert('Agendamento não encontrado.');
            return;
        }

        const win = window.open('', '_blank');
        const dateOut = item.DATA_RETIRADA ? new Date(item.DATA_RETIRADA).toLocaleDateString() : '-';
        const datePrev = item.DATA_DEVOLUCAO_PREVISTA ? new Date(item.DATA_DEVOLUCAO_PREVISTA).toLocaleDateString() : '-';
        const dateIn = item.DATA_DEVOLUCAO ? new Date(item.DATA_DEVOLUCAO).toLocaleDateString() : '-';

        const content = `
            <html>
                <head>
                    <title>Relatório de Agendamento #${item.ID_AGENDA}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .row { display: flex; margin-bottom: 10px; }
                        .label { font-weight: bold; width: 150px; }
                        .value { flex: 1; }
                        .section { margin-top: 20px; border: 1px solid #ccc; padding: 15px; border-radius: 5px; }
                        .status { font-weight: bold; padding: 2px 5px; border-radius: 3px; border: 1px solid #ccc; }
                        .btn-print { margin-bottom: 20px; padding: 10px 20px; cursor: pointer; }
                        @media print { .btn-print { display: none; } }
                    </style>
                </head>
                <body>
                    <button class="btn-print" onclick="window.print()">Imprimir</button>
                    
                    <div class="header">
                        <h2>Relatório de Agendamento</h2>
                        <p>ID: ${item.ID_AGENDA} | Data Emissão: ${new Date().toLocaleDateString()}</p>
                    </div>

                    <div class="section">
                        <h3>Dados do Cliente</h3>
                        <div class="row"><div class="label">Cliente:</div><div class="value">${item.CLIENTE_NOME || '-'} (ID: ${item.ID_CLIENTE})</div></div>
                        <div class="row"><div class="label">Contato:</div><div class="value">${item.NOME_CONTATO || '-'}</div></div>
                    </div>

                    <div class="section">
                        <h3>Detalhes do Equipamento</h3>
                        <div class="row"><div class="label">Contrato:</div><div class="value">${item.CONTRATO_DESC || '-'} (ID: ${item.ID_CONTRATO})</div></div>
                        <div class="row"><div class="label">Ativo:</div><div class="value">${item.ATIVO_DESC || '-'}</div></div>
                        <div class="row"><div class="label">Nº Série:</div><div class="value">${item.NUMERO_SERIE || '-'}</div></div>
                        <div class="row"><div class="label">Quantidade:</div><div class="value">${item.QUANTIDADE || 1}</div></div>
                    </div>

                    <div class="section">
                        <h3>Datas e Status</h3>
                        <div class="row"><div class="label">Status:</div><div class="value"><span class="status">${item.STATUS_NOME || '-'}</span></div></div>
                        <div class="row"><div class="label">Data Retirada:</div><div class="value">${dateOut}</div></div>
                        <div class="row"><div class="label">Prev. Devolução:</div><div class="value">${datePrev}</div></div>
                        <div class="row"><div class="label">Data Devolução:</div><div class="value">${dateIn}</div></div>
                    </div>

                    <div class="section">
                        <h3>Técnicos Responsáveis</h3>
                        <div class="value">${item.TECNICOS_NOMES || 'Nenhum técnico atribuído.'}</div>
                    </div>

                    <div class="section">
                        <h3>Observações</h3>
                        <div class="value" style="white-space: pre-wrap;">${item.OBSERVACAO || 'Nenhuma observação.'}</div>
                    </div>

                    <div style="margin-top: 50px; text-align: center; font-size: 0.8em; color: #666;">
                        <p>Gerado pelo Sistema Colaborar CRM</p>
                    </div>
                </body>
            </html>
        `;

        win.document.write(content);
        win.document.close();
    }

    async loadClients() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = '<div class="loading">Carregando clientes...</div>';

        try {
            const response = await fetch(`api/clientes?t=${Date.now()}`);
            if (!response.ok) throw new Error('Erro ao carregar clientes');

            this.clientsList = await response.json(); // Use clientsList for the grid to distinguish from shared clientsData if needed, though they are usually same.
            this.clientSearchTerm = '';

            this.renderClients(this.clientsList);
        } catch (error) {
            console.error(error);
            contentArea.innerHTML = `
                <div class="error-message">
                    <h3>Erro ao carregar dados</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    filterClients() {
        const term = (this.clientSearchTerm || '').toLowerCase();

        const filtered = this.clientsList.filter(client => {
            const name = (client.NOME_RAZAO || '').toLowerCase();
            const cpfCnpj = (client.CPF_CNPJ || '').toLowerCase();

            return name.includes(term) || cpfCnpj.includes(term);
        });

        this.renderClients(filtered, false);
    }

    renderClients(data, resetFilters = true) {
        const contentArea = document.getElementById('content-area');

        // Optimisation: Check if Clients Table Body already exists
        const existingTbody = document.getElementById('clientsTableBody');

        if (existingTbody) {
            if (data.length === 0) {
                existingTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 1rem;">Nenhum cliente encontrado.</td></tr>';
            } else {
                let rows = '';
                data.forEach(client => {
                    // Encode client object to pass safely
                    const clientData = encodeURIComponent(JSON.stringify(client));
                    rows += `
                        <tr>
                            <td>${client.ID_CLIENTE}</td>
                            <td>${client.NOME_RAZAO}</td>
                            <td>${client.CPF_CNPJ || '-'}</td>
                            <td>${client.EMAIL || '-'}</td>
                            <td>${client.TELEFONE || '-'}</td>
                            <td>
                                <button class="btn-icon" onclick="appManager.openClientModal('${clientData}')">✏️</button>
                                <button class="btn-icon" onclick="appManager.deleteClient(${client.ID_CLIENTE})">🗑️</button>
                            </td>
                        </tr>
                    `;
                });
                existingTbody.innerHTML = rows;
            }
            return;
        }


        // Header with Search
        const header = `
            <div class="card">
                <div class="card-header" style="flex-wrap: wrap; gap: 10px;">
                    <h2>Clientes</h2>
                    <div class="header-actions" style="flex-wrap: wrap; align-items: center; gap: 5px;">
                        <input type="text" class="form-control" style="width: 250px;" placeholder="Buscar por Nome ou CPF/CNPJ..." 
                               value="${this.clientSearchTerm || ''}" oninput="appManager.clientSearchTerm = this.value; appManager.filterClients()">
                        <button class="btn-primary" onclick="appManager.openClientModal()">Novo Cliente</button>
                    </div>
                </div>`;

        let tableHtml = header + `
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nome/Razão</th>
                                <th>CPF/CNPJ</th>
                                <th>Email</th>
                                <th>Telefone</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="clientsTableBody">
        `;

        if (data.length === 0) {
            tableHtml += '<tr><td colspan="6" style="text-align:center; padding: 1rem;">Nenhum cliente encontrado.</td></tr>';
        } else {
            data.forEach(client => {
                // Encode client object to pass safely
                const clientData = encodeURIComponent(JSON.stringify(client));
                tableHtml += `
                    <tr>
                        <td>${client.ID_CLIENTE}</td>
                        <td>${client.NOME_RAZAO}</td>
                        <td>${client.CPF_CNPJ || '-'}</td>
                        <td>${client.EMAIL || '-'}</td>
                        <td>${client.TELEFONE || '-'}</td>
                        <td>
                            <button class="btn-icon" onclick="appManager.openClientModal('${clientData}')">✏️</button>
                            <button class="btn-icon" onclick="appManager.deleteClient(${client.ID_CLIENTE})">🗑️</button>
                        </td>
                    </tr>
                `;
            });
        }

        tableHtml += '</tbody></table></div></div>';
        contentArea.innerHTML = tableHtml;
    }

    // --- AGENDA MODULE ---

    async loadAgenda() {
        // Loads main Agenda view (List of all active agendamentos)
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = '<div class="loading">Carregando Agenda...</div>';
        try {
            const agendamentos = await (await fetch('api/agendamentos')).json();
            this.agendaData = agendamentos; // Store for filtering
            this.agendaFilterStatus = 'Todos'; // Default filter
            this.renderAgenda(agendamentos);
        } catch (e) { this.showError('Erro ao carregar agenda', e.message); }
    }

    filterAgenda(filterType) {
        this.agendaFilterStatus = filterType;
        if (filterType === 'Todos') {
            this.renderAgenda(this.agendaData);
            return;
        }

        const filtered = this.agendaData.filter(item => {
            const status = (item.STATUS_NOME || '').toLowerCase();
            if (filterType === 'Locados') return status.includes('locado') || status.includes('alugado');
            if (filterType === 'Estoque') return status.includes('estoque') || status.includes('disponivel') || status.includes('disponível');
            if (filterType === 'Manutencao') return status.includes('manutenção') || status.includes('manutencao');

            return status.includes((filterType || '').toLowerCase());
        });
        this.renderAgenda(filtered);
    }

    async saveAgenda() {
        const id = document.getElementById('agendaId').value;
        const ID_CLIENTE = document.getElementById('agendaClient').value;
        const ID_CONTATO = document.getElementById('agendaContato').value;
        const ID_CONTRATO = document.getElementById('agendaContract').value;
        const ID_ATIVO = document.getElementById('agendaAsset').value;

        const DATA_RETIRADA = document.getElementById('agendaDataRetirada').value;
        const HORARIO_INICIO = document.getElementById('agendaHorarioInicio').value;
        const HORARIO_FIM = document.getElementById('agendaHorarioFim').value;
        const DATA_DEVOLUCAO_PREVISTA = document.getElementById('agendaDataDevolucaoPrevista').value;
        const DATA_DEVOLUCAO_ACTUAL = document.getElementById('agendaDateIn').value;

        const OBSERVACAO_DETALHE = document.getElementById('agendaObsDetail').value;
        const MOTIVO = document.getElementById('agendaReason').value;

        // Concatenate Reason and Details for DB storage
        // Format: "Motivo: [Reason] \n Detalhes: [Details]" or just combined
        let obsParts = [];
        if (MOTIVO) obsParts.push(`Motivo: ${MOTIVO}`);
        if (OBSERVACAO_DETALHE) obsParts.push(OBSERVACAO_DETALHE);

        const OBSERVACAO = obsParts.join('\n\n');

        const ID_STATUS = document.getElementById('agendaStatus').value;
        const QUANTIDADE = document.getElementById('agendaQuantidade').value || 1;

        // Technicians
        const tecnicos = Array.from(document.querySelectorAll('#agendaTechniciansContainer input[type="checkbox"]:checked'))
            .map(cb => parseInt(cb.value));

        if (!ID_CLIENTE || !DATA_RETIRADA) return alert('Cliente e Data Retirada são obrigatórios');

        const payload = {
            ID_CLIENTE, ID_CONTATO, ID_CONTRATO, ID_ATIVO,
            DATA_RETIRADA, HORARIO_INICIO, HORARIO_FIM,
            DATA_DEVOLUCAO_PREVISTA,
            DATA_DEVOLUCAO: DATA_DEVOLUCAO_ACTUAL,
            OBSERVACAO, ID_STATUS, QUANTIDADE,
            tecnicos
        };

        console.log('Saving Agenda Payload:', payload); // DEBUG


        try {
            const url = id ? `api/agendamentos/${id}` : 'api/agendamentos';
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                // alert('Agendamento salvo com sucesso!');
                this.closeModal('agendaModal');
                this.loadDashboard(); // Refresh dashboard

                // If we are on client view, we might want to refresh client agenda too?
                // check current view? For now dashboard refresh is main goal.
                const contentArea = document.getElementById('content-area');
                if (contentArea && contentArea.innerHTML.includes('Agendamentos')) {
                    // We are effectively in a view that lists agendas? 
                    // Usually Dashboard is the main view.
                }
            } else {
                alert('Erro ao salvar agendamento: ' + (data.error || 'Erro desconhecido'));
            }
        } catch (e) {
            console.error(e);
            alert('Erro de conexão ao salvar agendamento.');
        }
    }

    async deleteAgenda(id) {
        if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
        try {
            const res = await fetch(`api/agendamentos/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Erro ao excluir');
            this.loadAgenda();
        } catch (e) {
            alert('Erro: ' + e.message);
        }
    }

    // --- Render Agenda Table ---
    renderAgenda(data) {
        const contentArea = document.getElementById('content-area');

        const header = `
            <div class="card">
                <div class="card-header" style="flex-wrap: wrap; gap: 10px;">
                    <h2>Agenda</h2>
                    <div class="header-actions">
                        <div class="btn-group">
                             <button class="btn-sm ${(this.agendaFilterStatus === 'Todos') ? 'active' : ''}" onclick="appManager.filterAgenda('Todos')">Todos</button>
                             <button class="btn-sm ${(this.agendaFilterStatus === 'Manutencao') ? 'active' : ''}" onclick="appManager.filterAgenda('Manutencao')">Manutenção</button>
                             <button class="btn-sm ${(this.agendaFilterStatus === 'Estoque') ? 'active' : ''}" onclick="appManager.filterAgenda('Estoque')">Estoque</button>
                             <button class="btn-sm ${(this.agendaFilterStatus === 'Locados') ? 'active' : ''}" onclick="appManager.filterAgenda('Locados')">Locados</button>
                        </div>
                         <button class="btn-primary" onclick="appManager.openAgendaModal()">Novo Agendamento</button>
                    </div>
                </div>`;

        let tableHtml = header + `
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Data Retirada</th>
                                <th>Prev. Devolução</th>
                                <th>Cliente</th>
                                <th>Ativo</th>
                                <th>Técnicos</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="agendaTableBody">
        `;

        const renderRows = (list) => {
            if (!list || list.length === 0) return '<tr><td colspan="7" style="text-align:center; padding: 1rem;">Nenhum agendamento encontrado.</td></tr>';

            return list.map(item => {
                const itemData = encodeURIComponent(JSON.stringify(item));
                const dr = item.DATA_RETIRADA ? new Date(item.DATA_RETIRADA).toLocaleDateString() : '-';
                const dp = item.DATA_DEVOLUCAO_PREVISTA ? new Date(item.DATA_DEVOLUCAO_PREVISTA).toLocaleDateString() : '-';

                return `
                    <tr>
                        <td>${dr}</td>
                        <td>${dp}</td>
                        <td>${item.CLIENTE_NOME || '-'}</td>
                        <td>${item.ATIVO_DESC || '-'}</td>
                        <td><small>${item.TECNICOS_NOMES || '-'}</small></td>
                        <td><span class="badge" style="background:var(--bg-dark); color:var(--text-primary)">${item.STATUS_NOME || '-'}</span></td>
                        <td>
                            <button class="btn-icon" onclick="appManager.openAgendaModal(${item.ID_AGENDA})">✏️</button>
                            <button class="btn-icon" onclick="appManager.deleteAgenda(${item.ID_AGENDA})">🗑️</button>
                        </td>
                    </tr>
                `;
            }).join('');
        };

        const existingTbody = document.getElementById('agendaTableBody');
        if (existingTbody) {
            existingTbody.innerHTML = renderRows(data);
            // Also update active state of buttons if needed (handled by filterAgenda re-render usually)
            // Update Header buttons active state manually if we are only updating tbody
            const buttons = document.querySelectorAll('.header-actions .btn-sm');
            buttons.forEach(btn => {
                if (btn.textContent.trim() === 'Todos' && this.agendaFilterStatus === '') btn.classList.add('active');
                else if (btn.textContent.trim() === 'Manutenção' && this.agendaFilterStatus === 'Manutencao') btn.classList.add('active'); // Charset issue maybe
                else if (btn.onclick.toString().includes(`'${this.agendaFilterStatus}'`)) btn.classList.add('active');
                else btn.classList.remove('active');
            });
        } else {
            tableHtml += renderRows(data);
            tableHtml += `</tbody></table></div></div>`;
            contentArea.innerHTML = tableHtml;
        }
    }

    async loadAgendaDropdowns() {
        const clientSelect = document.getElementById('agendaClient');
        const statusSelect = document.getElementById('agendaStatus');

        // Load Clients
        try {
            console.log('Loading Agenda Clients...'); // DEBUG
            if (clientSelect) {
                const res = await fetch('api/clientes');
                const clients = await res.json();
                console.log('Clients loaded:', clients.length); // DEBUG

                clientSelect.innerHTML = '<option value="">Selecione...</option>';
                clients.forEach(c => clientSelect.options.add(new Option(c.NOME_RAZAO, c.ID_CLIENTE)));
            } else {
                console.error('Agenda Client Select not found in DOM');
            }
        } catch (e) { console.error('Error loading agenda clients', e); }

        // Load Status
        try {
            console.log('Loading Agenda Status...'); // DEBUG
            if (statusSelect) {
                const res = await fetch('api/status_contratos');
                const statuses = await res.json();
                console.log('Status loaded:', statuses.length); // DEBUG

                statusSelect.innerHTML = '<option value="">Selecione...</option>';
                statuses.forEach(s => {
                    const text = s.NOME || s.DESCRICAO || s.STATUS || ('Status ' + s.ID_STATUS);
                    statusSelect.options.add(new Option(text, s.ID_STATUS));
                });
            } else {
                console.error('Agenda Status Select not found in DOM');
            }
        } catch (e) { console.error('Error loading agenda status', e); }
    }

    async onAgendaClientChange() {
        const clientId = document.getElementById('agendaClient').value;
        const contactSelect = document.getElementById('agendaContact');
        const contractSelect = document.getElementById('agendaContract');

        contactSelect.innerHTML = '<option value="">Carregando...</option>';
        contractSelect.innerHTML = '<option value="">Carregando...</option>';

        if (!clientId) {
            contactSelect.innerHTML = '<option value="">Selecione um Cliente primeiro...</option>';
            contractSelect.innerHTML = '<option value="">Selecione um Cliente primeiro...</option>';
            return;
        }

        try {
            const [contactsRes, contractsRes] = await Promise.all([
                fetch(`api/contatos?cliente=${clientId}`),
                fetch(`api/contratos/cliente/${clientId}`)
            ]);

            const contacts = await contactsRes.json();
            const contracts = await contractsRes.json();

            // Populate Contacts
            contactSelect.innerHTML = '<option value="">Selecione...</option>';
            if (contacts.length === 0) contactSelect.innerHTML = '<option value="">Nenhum contato encontrado</option>';
            contacts.forEach(c => {
                contactSelect.options.add(new Option(c.NOME_CONTATO, c.ID_CONTATO));
            });

            // Populate Contracts
            contractSelect.innerHTML = '<option value="">Selecione...</option>';
            if (contracts.length === 0) contractSelect.innerHTML = '<option value="">Nenhum contrato ativo</option>';
            contracts.forEach(c => {
                contractSelect.options.add(new Option((c.DESCRICAO || `Contrato ${c.ID_CONTRATO}`), c.ID_CONTRATO));
            });

        } catch (error) {
            console.error("Error loading dependent dropdowns:", error);
            contactSelect.innerHTML = '<option value="">Erro ao carregar</option>';
            contractSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    async onAgendaContractChange() {
        const contractId = document.getElementById('agendaContract').value;
        const assetSelect = document.getElementById('agendaAsset');

        assetSelect.innerHTML = '<option value="">Carregando...</option>';

        try {
            let url = 'api/ativos/disponiveis';
            if (contractId) url += `?contrato=${contractId}`;

            const res = await fetch(url);
            const assets = await res.json();

            assetSelect.innerHTML = '<option value="">Selecione...</option>';
            if (assets.length === 0) assetSelect.innerHTML = '<option value="">Nenhum ativo disponível</option>';

            assets.forEach(a => {
                const label = `${a.DESCRICAO} (${a.NUMERO_SERIE || 'S/N'})`;
                assetSelect.options.add(new Option(label, a.ID_ATIVO));
            });

        } catch (error) {
            console.error("Error loading assets:", error);
            assetSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    async loadTechniciansSelection() {
        const container = document.getElementById('agendaTechniciansContainer');
        if (!container) return;

        container.innerHTML = 'Carregando...';

        try {
            const res = await fetch('api/tecnicos');
            const data = await res.json();

            if (data.length === 0) {
                container.innerHTML = 'Nenhum técnico cadastrado.';
                return;
            }

            container.innerHTML = '';
            data.forEach(tech => {
                const label = document.createElement('label');
                label.style.display = 'block';
                label.style.marginBottom = '5px';
                label.innerHTML = `
                    <input type="checkbox" value="${tech.ID_TECNICO}"> ${tech.NOME}
                `;
                container.appendChild(label);
            });
        } catch (e) {
            console.error('Error loading technicians', e);
            container.innerHTML = 'Erro ao carregar técnicos.';
        }
    }

    async openAgendaModal(agendaId = null) {
        // alert('openAgendaModal INICIO'); // DEBUG
        const modal = document.getElementById('agendaModal');
        const modalTitle = document.getElementById('agendaModalTitle');
        const form = document.getElementById('agendaForm');

        // Reset form
        form.reset();
        document.getElementById('agendaId').value = '';

        // Load Dropdowns & Technicians
        try {
            await this.loadAgendaDropdowns();
        } catch (e) {
            console.error('CRITICAL: loadAgendaDropdowns failed', e);
        }

        try {
            await this.loadTechniciansSelection();
        } catch (e) { console.error('ERRO loadTech: ' + e.message); }

        if (agendaId) {
            // Edit Mode
            // Find item in local data (robust against encoding issues)
            const item = this.agendaData ? this.agendaData.find(i => i.ID_AGENDA == agendaId) : null;

            if (item) {
                modalTitle.innerText = 'Editar Agendamento';
                document.getElementById('agendaId').value = item.ID_AGENDA;

                // Populate Dropdowns sequentially to ensure dependent data is loaded?
                // loadAgendaDropdowns handles basics. 
                // We need to set values.

                document.getElementById('agendaClient').value = item.ID_CLIENTE;
                // Load contacts for this client
                // Assuming loadAgendaClientContacts is a new function or onAgendaClientChange handles this
                await this.onAgendaClientChange(); // Trigger load contacts/contracts for this client
                document.getElementById('agendaContato').value = item.ID_CONTATO || '';

                document.getElementById('agendaContract').value = item.ID_CONTRATO || '';

                const formatDate = (d) => d ? d.split('T')[0] : '';
                const formatTime = (t) => {
                    if (!t) return '';
                    // If it matches HH:MM pattern already
                    if (t.length === 5 && t.includes(':') && !t.includes('T')) return t;

                    // If it is an ISO string or Date object
                    const d = new Date(t);
                    if (!isNaN(d.getTime())) {
                        const h = d.getHours().toString().padStart(2, '0');
                        const m = d.getMinutes().toString().padStart(2, '0');
                        return `${h}:${m}`;
                    }

                    // Fallback substring if all else fails
                    return typeof t === 'string' ? t.substring(0, 5) : '';
                };



                document.getElementById('agendaDataRetirada').value = formatDate(item.DATA_RETIRADA);
                document.getElementById('agendaHorarioInicio').value = formatTime(item.HORARIO_INICIO);
                document.getElementById('agendaHorarioFim').value = formatTime(item.HORARIO_FIM);
                document.getElementById('agendaDataDevolucaoPrevista').value = formatDate(item.DATA_DEVOLUCAO_PREVISTA);
                document.getElementById('agendaDateIn').value = formatDate(item.DATA_DEVOLUCAO);

                // Load Assets for this contract
                await this.onAgendaContractChange();
                document.getElementById('agendaAsset').value = item.ID_ATIVO || '';

                // Split OBSERVACAO if possible
                let obsText = item.OBSERVACAO || '';
                let reasonText = '';

                if (obsText.startsWith('Motivo: ')) {
                    const parts = obsText.split('\n\n');
                    // Assumes first part is Motivo
                    reasonText = parts[0].replace('Motivo: ', '');
                    // Remaining parts are details
                    obsText = parts.slice(1).join('\n\n');
                }

                document.getElementById('agendaObsDetail').value = obsText;
                document.getElementById('agendaReason').value = reasonText;

                document.getElementById('agendaStatus').value = item.ID_STATUS || '';
                document.getElementById('agendaQuantidade').value = item.QUANTIDADE || 1;

                // Technicians Checkboxes
                // item.TECNICOS_IDS is "1, 2" string
                if (item.TECNICOS_IDS) {
                    const techIds = item.TECNICOS_IDS.split(',').map(id => parseInt(id.trim()));
                    const checkboxes = document.querySelectorAll('#agendaTechniciansContainer input[type="checkbox"]');
                    checkboxes.forEach(cb => {
                        if (techIds.includes(parseInt(cb.value))) {
                            cb.checked = true;
                        }
                    });
                }
            }
        } else {
            // New Mode
            modalTitle.textContent = 'Novo Agendamento';
            document.getElementById('agendaStatus').value = 1; // Default Planned

            // Set Today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('agendaDataRetirada').value = today;
        }

        modal.classList.add('active');
    }



    openClientModal(clientData = null) {
        console.log("Opening Client Modal, data present:", !!clientData);
        const modal = document.getElementById('clientModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('clientForm');

        if (!modal || !form) {
            console.error("Client modal elements not found!");
            return;
        }

        form.reset();
        document.getElementById('clientId').value = '';

        // Reset Tabs
        this.switchClientTab('basics');
        document.getElementById('clientContactsBody').innerHTML = '';

        if (clientData) {
            try {
                const client = JSON.parse(decodeURIComponent(clientData));
                console.log("Editing client:", client.ID_CLIENTE);

                // FIX: Force trim and uppercase on frontend to ensure dropdowns match
                // This handles cases where server-side trim might not have deployed yet
                client.TIPO_PESSOA = (client.TIPO_PESSOA || '').trim().toUpperCase();
                client.UF = (client.UF || '').trim().toUpperCase();

                title.textContent = 'Editar Cliente';
                document.getElementById('clientId').value = client.ID_CLIENTE;
                document.getElementById('clientName').value = client.NOME_RAZAO;
                document.getElementById('clientFantasy').value = client.NOME_FANTASIA || '';
                document.getElementById('clientType').value = client.TIPO_PESSOA || 'F';
                document.getElementById('clientCpfCnpj').value = client.CPF_CNPJ || '';
                document.getElementById('clientIE').value = client.IE || '';
                document.getElementById('clientEmail').value = client.EMAIL || '';
                document.getElementById('clientPhone').value = client.TELEFONE || '';
                document.getElementById('clientAddress').value = client.ENDERECO || '';
                document.getElementById('clientNumber').value = client.NUMERO || '';
                document.getElementById('clientComplement').value = client.COMPLEMENTO || '';
                document.getElementById('clientNeighborhood').value = client.BAIRRO || '';
                document.getElementById('clientZip').value = client.CEP || '';
                document.getElementById('clientCity').value = client.MUNICIPIO || '';
                document.getElementById('clientState').value = client.UF || '';

                // Load Contacts
                this.loadClientContacts(client.ID_CLIENTE);
            } catch (e) {
                console.error("Error parsing client data:", e);
                this.showError('Erro ao abrir cliente', 'Falha ao processar dados do registro.');
                return;
            }
        } else {
            title.textContent = 'Novo Cliente';
        }

        modal.classList.add('active');
    }

    switchClientTab(tabName) {
        // Updated logic to use IDs directly for stability
        const tabBasics = document.getElementById('tab-client-basics');
        const tabContacts = document.getElementById('tab-client-contacts');
        const buttons = document.querySelectorAll('.tab-nav .tab-btn');

        if (!tabBasics || !tabContacts) return;

        // Hide all
        tabBasics.classList.remove('active');
        tabContacts.classList.remove('active');
        buttons.forEach(b => b.classList.remove('active'));

        if (tabName === 'basics') {
            tabBasics.classList.add('active');
            if (buttons[0]) buttons[0].classList.add('active');
        } else {
            tabContacts.classList.add('active');
            if (buttons[1]) buttons[1].classList.add('active');
        }
    }

    async loadClientContacts(clientId) {
        const tbody = document.getElementById('clientContactsBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Carregando contatos...</td></tr>';

        try {
            const res = await fetch(`api/clientes/${clientId}/contatos`);
            const contacts = await res.json();

            if (contacts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-secondary)">Nenhum contato cadastrado.</td></tr>';
                return;
            }

            tbody.innerHTML = contacts.map(c => `
                <tr>
                    <td>${c.NOME_CONTATO}</td>
                    <td>${c.CARGO || '-'}</td>
                    <td>${c.TELEFONE_CONTATO || '-'}</td>
                    <td>${c.EMAIL_CONTATO || '-'}</td>
                    <td>
                        <button class="btn-icon" onclick='appManager.openContactModal(${JSON.stringify(c)})'>✏️</button>
                        <button class="btn-icon" onclick="appManager.deleteContact(${c.ID_CONTATO}, ${clientId})">🗑️</button>
                    </td>
                </tr>
            `).join('');

        } catch (e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="5" style="color:salmon">Erro ao carregar contatos.</td></tr>';
        }
    }

    openContactModal(contactData = null) {
        const clientId = document.getElementById('clientId').value;
        if (!clientId && !contactData) {
            alert('Salve o cliente antes de adicionar contatos.');
            return;
        }

        const modal = document.getElementById('contactModal');
        const form = document.getElementById('contactForm');
        form.reset();
        document.getElementById('contactId').value = '';
        document.getElementById('contactClientId').value = clientId;

        if (contactData) {
            // Edit Mode - contactData can be object or ID. 
            // If passed from onclick above, it is the full object.
            const contact = (typeof contactData === 'object') ? contactData : null; // Logic simplifiction

            if (contact) {
                document.getElementById('contactModalTitle').innerText = 'Editar Contato';
                document.getElementById('contactId').value = contact.ID_CONTATO;
                document.getElementById('contactClientId').value = contact.ID_CLIENTE;
                document.getElementById('contactName').value = contact.NOME_CONTATO;
                document.getElementById('contactPhone').value = contact.TELEFONE_CONTATO || '';
                document.getElementById('contactEmail').value = contact.EMAIL_CONTATO || '';
                document.getElementById('contactRole').value = contact.CARGO || '';
                document.getElementById('contactType').value = contact.TIPO_CONTATO || 'Comercial';
                document.getElementById('contactObs').value = contact.OBSERVACAO || '';
            }
        } else {
            document.getElementById('contactModalTitle').innerText = 'Novo Contato';
        }

        modal.classList.add('active');
    }

    async saveContact() {
        const id = document.getElementById('contactId').value;
        const ID_CLIENTE = document.getElementById('contactClientId').value;
        const NOME_CONTATO = document.getElementById('contactName').value;
        const TELEFONE_CONTATO = document.getElementById('contactPhone').value;
        const EMAIL_CONTATO = document.getElementById('contactEmail').value;
        const CARGO = document.getElementById('contactRole').value;
        const TIPO_CONTATO = document.getElementById('contactType').value;
        const OBSERVACAO = document.getElementById('contactObs').value;

        if (!NOME_CONTATO) return alert('Nome é obrigatório');

        const payload = { ID_CLIENTE, NOME_CONTATO, TELEFONE_CONTATO, EMAIL_CONTATO, CARGO, TIPO_CONTATO, OBSERVACAO };

        try {
            const url = id ? `api/contatos/${id}` : 'api/contatos';
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Erro ao salvar contato');

            this.closeModal('contactModal');
            this.loadClientContacts(ID_CLIENTE); // Reload list
            alert('Contato salvo!');

        } catch (e) {
            alert('Erro: ' + e.message);
        }
    }

    async deleteContact(id, clientId) {
        if (!confirm('Excluir este contato?')) return;
        try {
            const res = await fetch(`api/contatos/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Erro ao excluir');
            this.loadClientContacts(clientId);
        } catch (e) {
            alert('Erro: ' + e.message);
        }
    }

    closeModal(modalId = 'clientModal') {
        document.getElementById(modalId).classList.remove('active');
    }




    async loadClientContacts(clientId) {
        const tbody = document.getElementById('clientContactsBody');
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Carregando contatos...</td></tr>';

        try {
            const res = await fetch(`api/clientes/${clientId}/contatos`);
            const contacts = await res.json();

            if (contacts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-secondary)">Nenhum contato cadastrado.</td></tr>';
                return;
            }

            tbody.innerHTML = contacts.map(c => `
                <tr>
                    <td>${c.NOME_CONTATO}</td>
                    <td>${c.CARGO || '-'}</td>
                    <td>${c.TELEFONE_CONTATO || '-'}</td>
                    <td>${c.EMAIL_CONTATO || '-'}</td>
                    <td>
                        <button class="btn-icon" onclick='appManager.openContactModal(${JSON.stringify(c)})'>✏️</button>
                        <button class="btn-icon" onclick="appManager.deleteContact(${c.ID_CONTATO}, ${clientId})">🗑️</button>
                    </td>
                </tr>
            `).join('');

        } catch (e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="5" style="color:salmon">Erro ao carregar contatos.</td></tr>';
        }
    }

    openContactModal(contactData = null) {
        const clientId = document.getElementById('clientId').value;
        if (!clientId && !contactData) {
            alert('Salve o cliente antes de adicionar contatos.');
            return;
        }

        const modal = document.getElementById('contactModal');
        const form = document.getElementById('contactForm');
        form.reset();
        document.getElementById('contactId').value = '';
        document.getElementById('contactClientId').value = clientId;

        if (contactData) {
            // Edit Mode
            const contact = (typeof contactData === 'object') ? contactData : null;

            if (contact) {
                document.getElementById('contactModalTitle').innerText = 'Editar Contato';
                document.getElementById('contactId').value = contact.ID_CONTATO;
                document.getElementById('contactClientId').value = contact.ID_CLIENTE;
                document.getElementById('contactName').value = contact.NOME_CONTATO;
                document.getElementById('contactPhone').value = contact.TELEFONE_CONTATO || '';
                document.getElementById('contactEmail').value = contact.EMAIL_CONTATO || '';
                document.getElementById('contactRole').value = contact.CARGO || '';
                document.getElementById('contactType').value = contact.TIPO_CONTATO || 'Comercial';
                document.getElementById('contactObs').value = contact.OBSERVACAO || '';
            }
        } else {
            document.getElementById('contactModalTitle').innerText = 'Novo Contato';
        }

        modal.classList.add('active');
    }

    async saveContact() {
        const id = document.getElementById('contactId').value;
        const ID_CLIENTE = document.getElementById('contactClientId').value;
        const NOME_CONTATO = document.getElementById('contactName').value;
        const TELEFONE_CONTATO = document.getElementById('contactPhone').value;
        const EMAIL_CONTATO = document.getElementById('contactEmail').value;
        const CARGO = document.getElementById('contactRole').value;
        const TIPO_CONTATO = document.getElementById('contactType').value;
        const OBSERVACAO = document.getElementById('contactObs').value;

        if (!NOME_CONTATO) return alert('Nome é obrigatório');

        const payload = { ID_CLIENTE, NOME_CONTATO, TELEFONE_CONTATO, EMAIL_CONTATO, CARGO, TIPO_CONTATO, OBSERVACAO };

        try {
            const url = id ? `api/contatos/${id}` : 'api/contatos';
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Erro ao salvar contato');

            this.closeModal('contactModal');
            this.loadClientContacts(ID_CLIENTE); // Reload list
            alert('Contato salvo!');

        } catch (e) {
            alert('Erro: ' + e.message);
        }
    }

    async deleteContact(id, clientId) {
        if (!confirm('Excluir este contato?')) return;
        try {
            const res = await fetch(`api/contatos/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Erro ao excluir');
            this.loadClientContacts(clientId);
        } catch (e) {
            alert('Erro: ' + e.message);
        }
    }

    // ... (Client save/delete logic remains) ...

    async openContractModal(contractData = null) {
        const modal = document.getElementById('contractModal');
        const title = document.getElementById('contractModalTitle');
        const form = document.getElementById('contractForm');

        // Fields for Client Toggle
        const clientSelect = document.getElementById('contractClient');
        const clientInput = document.getElementById('contractClientName');

        form.reset();
        document.getElementById('contractId').value = '';

        // Load Dropdowns
        await this.loadDropdowns();

        if (contractData) {
            const contract = JSON.parse(decodeURIComponent(contractData));
            title.textContent = 'Editar Contrato';
            document.getElementById('contractId').value = contract.ID_CONTRATO;

            // Edit Mode: Show Name Input, Hide Select (but set value for save)
            clientSelect.style.display = 'none';
            clientInput.style.display = 'block';
            clientInput.value = contract.NOME_RAZAO || 'Cliente não encontrado';
            clientSelect.value = contract.ID_CLIENTE; // Keep hidden value for save logic

            // Make Start Date Read-Only
            const startInput = document.getElementById('contractStart');
            startInput.readOnly = true;
            startInput.value = contract.DATA_INICIO ? contract.DATA_INICIO.split('T')[0] : '';

            document.getElementById('contractDesc').value = contract.DESCRICAO || '';
            document.getElementById('contractEnd').value = contract.DATA_FIM ? contract.DATA_FIM.split('T')[0] : '';
            document.getElementById('contractValue').value = contract.VALOR_MENSAL;
            document.getElementById('contractStatus').value = contract.ID_STATUS;
            document.getElementById('contractSLA').value = contract.SLAID || '';
            document.getElementById('contractObs').value = contract.OBSERVACOES || '';
        } else {
            title.textContent = 'Novo Contrato';

            // New Mode: Show Select, Hide Input
            clientSelect.style.display = 'block';
            clientInput.style.display = 'none';

            // Make Start Date Writable
            document.getElementById('contractStart').readOnly = false;
        }

        modal.classList.add('active');
    }

    async loadDropdowns() {
        const clientSelect = document.getElementById('contractClient');
        const statusSelect = document.getElementById('contractStatus');
        const slaSelect = document.getElementById('contractSLA');
        const assetOwner = document.getElementById('assetOwner');
        const assetStatusDb = document.getElementById('assetStatusDb');
        const userProfile = document.getElementById('userProfile');

        const clients = await (await fetch('api/clientes')).json();

        // 1. Contract Client
        if (clientSelect && clientSelect.innerHTML.length < 100) {
            clientSelect.innerHTML = '<option value="">Selecione...</option>';
            clients.forEach(c => clientSelect.options.add(new Option(c.NOME_RAZAO, c.ID_CLIENTE)));
        }

        // 2. Asset Owner
        if (assetOwner && assetOwner.innerHTML.length < 100) {
            assetOwner.innerHTML = '<option value="">Nenhum (Próprio)</option>';
            clients.forEach(c => assetOwner.options.add(new Option(c.NOME_RAZAO, c.ID_CLIENTE)));
        }

        // 3. Contract Status (Updated to use STATUS_CONTRATO)
        // Removed length check to FORCE reload and debug
        if (statusSelect) {
            try {
                const response = await fetch('api/status_contratos');
                if (!response.ok) throw new Error('Falha ao buscar status');
                const statuses = await response.json();

                console.log('Status Contratos Carregados:', statuses); // Debug

                statusSelect.innerHTML = '<option value="">Selecione...</option>';
                statuses.forEach(s => {
                    // Use NOME (or fallback to DESCRICAO/STATUS)
                    const text = s.NOME || s.DESCRICAO || s.STATUS || ('Status ' + s.ID_STATUS);
                    statusSelect.options.add(new Option(text, s.ID_STATUS));
                });
            } catch (e) {
                console.error("Erro ao carregar status contratos:", e);
                // Optional: alert users
                // alert('Erro ao carregar status: ' + e.message);
            }
        }

        // 4. Asset Status (Fixed "STATUS" table)
        if (assetStatusDb && assetStatusDb.innerHTML.length < 100) {
            try {
                const assetStatuses = await (await fetch('api/status')).json();
                assetStatusDb.innerHTML = '<option value="">Selecione...</option>';
                assetStatuses.forEach(s => {
                    assetStatusDb.options.add(new Option(s.STATUS, s.ID_STATUS));
                });
            } catch (e) { console.error("Error loading asset status", e); }
        }

        // 5. SLA List
        if (slaSelect && slaSelect.options.length <= 1) {
            try {
                const response = await fetch('api/sla');
                if (!response.ok) throw new Error('Falha ao buscar SLAs');
                const slas = await response.json();

                console.log('SLAs Carregados:', slas); // Debug

                slaSelect.innerHTML = '<option value="">Selecione...</option>';
                slas.forEach(sla => {
                    const text = sla.SLDESC || sla.NOME || `SLA ${sla.ID_SLA}`;
                    const value = sla.ID_SLA || sla.IDSLA || sla.ID;
                    slaSelect.options.add(new Option(text, value));
                });
            } catch (e) {
                console.error("Erro ao carregar SLAs:", e);
            }
        }
        // 5. User Profiles
        if (userProfile) { // Removed length check to force reload
            try {
                const profiles = await (await fetch('api/perfis')).json();
                userProfile.innerHTML = '<option value="">Selecione...</option>';
                profiles.forEach(p => userProfile.options.add(new Option(p.NOME, p.ID_PERFIL)));
            } catch (e) { console.error("Error loading profiles", e); }
        }

        // 6. Asset Products (New)
        const assetProduct = document.getElementById('assetProduct');
        if (assetProduct) {
            try {
                const products = await (await fetch('api/produtos')).json();
                assetProduct.innerHTML = '<option value="">Selecione um produto...</option>';
                products.forEach(p => {
                    const text = `${p.NOME} (${p.UNIDADE})`;
                    assetProduct.options.add(new Option(text, p.ID_PRODUTO));
                });
            } catch (e) { console.error("Error loading products for assets", e); }
        }
    }

    async saveContract() {
        const id = document.getElementById('contractId').value;
        const clientSelect = document.getElementById('contractClient');

        // If editing, ID_CLIENTE comes from the select (which has the value set programmatically)
        // or we can ensure it's set.
        const idCliente = clientSelect.value;

        const data = {
            ID_CLIENTE: idCliente,
            DATA_INICIO: document.getElementById('contractStart').value,
            DATA_FIM: document.getElementById('contractEnd').value || null,
            VALOR_MENSAL: document.getElementById('contractValue').value || 0,
            ID_STATUS: document.getElementById('contractStatus').value,
            SLAID: document.getElementById('contractSLA').value || null,
            DESCRICAO: document.getElementById('contractDesc').value,
            OBSERVACOES: document.getElementById('contractObs').value
        };

        // Validation - Logic update:
        // In Edit mode, Start Date might be read-only but should still have value
        // Client ID should correspond to the read-only client
        if (!data.ID_CLIENTE || !data.DATA_INICIO || !data.ID_STATUS) {
            alert('Cliente, Data Início e Status são obrigatórios!');
            return;
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `api/contratos/${id}` : 'api/contratos';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Erro ao salvar');

            this.closeModal('contractModal');
            this.loadContracts();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar contrato: ' + error.message);
        }
    }

    async deleteContract(id) {
        if (!confirm('Tem certeza que deseja excluir este contrato?')) return;
        try {
            const response = await fetch(`api/contratos/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Erro ao excluir');
            this.loadContracts();
        } catch (error) {
            alert('Erro ao excluir: ' + error.message);
        }
    }

    async saveClient() {
        const id = document.getElementById('clientId').value;
        const data = {
            NOME_RAZAO: document.getElementById('clientName').value,
            NOME_FANTASIA: document.getElementById('clientFantasy').value,
            TIPO_PESSOA: document.getElementById('clientType').value,
            CPF_CNPJ: document.getElementById('clientCpfCnpj').value,
            IE: document.getElementById('clientIE').value,
            EMAIL: document.getElementById('clientEmail').value,
            TELEFONE: document.getElementById('clientPhone').value,
            ENDERECO: document.getElementById('clientAddress').value,
            NUMERO: document.getElementById('clientNumber').value,
            COMPLEMENTO: document.getElementById('clientComplement').value,
            BAIRRO: document.getElementById('clientNeighborhood').value,
            CEP: document.getElementById('clientZip').value,
            MUNICIPIO: document.getElementById('clientCity').value,
            UF: document.getElementById('clientState').value,
            CODIGO_PAIS: 1058, // Default Brazil
        };

        if (!data.NOME_RAZAO || !data.CPF_CNPJ) {
            alert('Nome e CPF/CNPJ são obrigatórios!');
            return;
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `api/clientes/${id}` : 'api/clientes';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!result.success && !result.id) {
                throw new Error(result.error || 'Erro ao salvar cliente');
            }

            this.closeModal('clientModal');
            this.loadClients();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar: ' + error.message);
        }
    }

    async deleteClient(id) {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

        try {
            const response = await fetch(`api/clientes/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Erro ao excluir');
            this.loadClients();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir cliente: ' + error.message);
        }
    }
    // --- AGENDA MODULE ---







    async onAgendaClientChange() {
        const clientId = document.getElementById('agendaClient').value;
        const contactSelect = document.getElementById('agendaContato');
        const contractSelect = document.getElementById('agendaContract');

        if (contactSelect) contactSelect.innerHTML = '<option value="">Selecione...</option>';
        if (contractSelect) contractSelect.innerHTML = '<option value="">Selecione...</option>';

        if (!clientId) return;

        // Load Contacts
        try {
            const contacts = await (await fetch(`api/contatos?cliente=${clientId}`)).json();
            contacts.forEach(c => contactSelect.options.add(new Option(c.NOME_CONTATO, c.ID_CONTATO)));
        } catch (e) { console.error(e); }

        // Load Contracts
        try {
            const contracts = await (await fetch(`api/contratos/cliente/${clientId}`)).json();
            contracts.forEach(c => contractSelect.options.add(new Option(c.DESCRICAO || `Contrato ${c.ID_CONTRATO}`, c.ID_CONTRATO)));
        } catch (e) { console.error(e); }

        // Update Locados List if on that tab
        this.searchLocados();
    }

    async onAgendaContractChange() {
        // Load Assets (Available)
        const assetSelect = document.getElementById('agendaAsset');
        assetSelect.innerHTML = '<option value="">Selecione...</option>';

        // Optimization: We could filter by contract if backend supported it, 
        // but currently we fetch "Available" assets.
        // Also user said: "COMBOBOX LISTANDO OS CONTRATOS... E OUM COMBOBOX COM OS ATIVOS DESSE CONTRATO SELECIONADO"
        // Since we don't have Items_Contrato, we assume "Assets available to be put on this contract".

        try {
            // Fetch ALL available assets
            const assets = await (await fetch('api/ativos/disponiveis')).json();
            assets.forEach(a => {
                assetSelect.options.add(new Option(`${a.DESCRICAO} (${a.NUMERO_SERIE || 'S/N'})`, a.ID_ATIVO));
            });
        } catch (e) { console.error(e); }

        this.searchLocados();
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

        document.getElementById(tabId).style.display = 'block';
        // Find button that targets this tab (simple heuristic: text match or keep ref?)
        // Better: iterate buttons
        if (tabId === 'tabAgendamento') document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        if (tabId === 'tabLocados') {
            document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
            this.searchLocados(); // Auto refresh
        }
    }



    // --- Technicians Management ---

    async loadTechniciansView() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div id="tecnicos-view" class="view-section">
                <div class="header-actions">
                    <h2>Gestão de Técnicos</h2>
                    <button class="btn-primary" onclick="appManager.openTechnicianModal()">Novo Técnico</button>
                </div>
                <div class="card">
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Especialidades</th>
                                    <th>Email</th>
                                    <th>Telefone</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="tecnicosTableBody">
                                <tr><td colspan="5">Carregando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        try {
            const res = await fetch('api/tecnicos');
            const data = await res.json();
            this.renderTechnicians(data);
            this.tecnicosData = data; // Store for Edit
        } catch (e) {
            console.error(e);
            document.getElementById('tecnicosTableBody').innerHTML = '<tr><td colspan="5">Erro ao carregar técnicos.</td></tr>';
        }
    }

    renderTechnicians(data) {
        const tbody = document.getElementById('tecnicosTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">Nenhum técnico cadastrado.</td></tr>';
            return;
        }

        const formatPhone = (p) => {
            if (!p) return '-';
            let v = p.replace(/\D/g, '');
            if (v.length === 11) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
            if (v.length === 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
            return p;
        };

        tbody.innerHTML = data.map(t => `
            <tr>
                <td>${t.NOME}</td>
                <td>${t.ESPECIALIDADES || '-'}</td>
                <td>${t.EMAIL || '-'}</td>
                <td>${formatPhone(t.TELEFONE)}</td>
                <td>
                    <button class="btn-icon" onclick="appManager.openTechnicianModal(${t.ID_TECNICO})">✏️</button>
                    <button class="btn-icon" onclick="appManager.deleteTechnician(${t.ID_TECNICO})">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    async openTechnicianModal(id = null) {
        console.log("Opening Technician Modal, ID:", id);
        const modal = document.getElementById('technicianModal');
        const form = document.getElementById('technicianForm');
        const title = document.getElementById('technicianModalTitle');
        const container = document.getElementById('techSpecialtiesContainer');

        if (!modal || !form) {
            console.error("Technician modal elements not found!");
            return;
        }

        form.reset();
        document.getElementById('techId').value = '';

        // Load Specialties Checkboxes
        container.innerHTML = 'Carregando...';
        try {
            const res = await fetch('api/especialidades');
            const specs = await res.json();
            container.innerHTML = specs.map(s => `
                <div style="margin-bottom:5px;">
                    <label style="display:flex; align-items:center; cursor:pointer;">
                        <input type="checkbox" name="techSpecialties" value="${s.ID_ESPECIALIDADE}" style="margin-right:8px;">
                        ${s.NOME}
                    </label>
                </div>
            `).join('');
        } catch (e) { container.innerHTML = 'Erro ao carregar especialidades.'; }


        if (id) {
            title.textContent = 'Editar Técnico';
            const tech = this.tecnicosData.find(t => t.ID_TECNICO == id);
            if (tech) {
                document.getElementById('techId').value = tech.ID_TECNICO;
                document.getElementById('techName').value = tech.NOME;
                document.getElementById('techCpf').value = tech.CPF || '';
                document.getElementById('techEmail').value = tech.EMAIL || '';
                document.getElementById('techPhone').value = tech.TELEFONE || '';

                // Check specialties (Matching IDs)
                console.log("Editing Tech:", tech); // DEBUG
                console.log("Spec IDs raw:", tech.ESPECIALIDADES_IDS); // DEBUG

                if (tech.ESPECIALIDADES_IDS) {
                    // Handle potential Blob->String conversion artifacts or lack thereof
                    const idString = String(tech.ESPECIALIDADES_IDS);
                    const techSpecIds = idString.split(',').map(id => parseInt(id.trim()));
                    console.log("Parsed IDs:", techSpecIds); // DEBUG

                    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach(cb => {
                        if (techSpecIds.includes(parseInt(cb.value))) {
                            cb.checked = true;
                        }
                    });
                } else if (tech.ESPECIALIDADES) {
                    // Fallback to Name matching if IDs missing for some reason
                    const techSpecs = tech.ESPECIALIDADES.split(',').map(s => s.trim());
                    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach(cb => {
                        const labelText = cb.parentElement.innerText.trim();
                        if (techSpecs.includes(labelText)) cb.checked = true;
                    });
                }
            }
        } else {
            title.textContent = 'Novo Técnico';
        }

        modal.classList.add('active');
    }

    async saveTechnician() {
        const id = document.getElementById('techId').value;
        const NOME = document.getElementById('techName').value;
        const CPF = document.getElementById('techCpf').value;
        const EMAIL = document.getElementById('techEmail').value;
        const TELEFONE = document.getElementById('techPhone').value;

        // Get Specialties
        const checkboxes = document.querySelectorAll('input[name="techSpecialties"]:checked');
        const especialidades = Array.from(checkboxes).map(cb => parseInt(cb.value));

        console.log("Saving Tech - Specialties found:", checkboxes.length); // DEBUG
        console.log("Saving Tech - Payload specs:", especialidades); // DEBUG

        if (!NOME) return alert('Nome é obrigatório');

        const body = { NOME, CPF, EMAIL, TELEFONE, especialidades };
        console.log("Saving Body:", body); // DEBUG

        const method = id ? 'PUT' : 'POST';
        const url = id ? `api/tecnicos/${id}` : 'api/tecnicos';

        console.log(`[DEBUG] Attempting Fetch: ${method} ${url}`);

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            console.log(`[DEBUG] Fetch Response: ${res.status} ${res.statusText}`);
            if (res.ok) {
                this.closeModal('technicianModal');
                this.loadTechniciansView();
                alert('Técnico salvo com sucesso!');
            } else {
                const err = await res.json();
                alert('Erro: ' + (err.error || 'Erro desconhecido'));
            }
        } catch (e) { alert('Erro de conexão: ' + e.message); }
    }

    async deleteTechnician(id) {
        if (!confirm('Excluir técnico?')) return;
        try {
            await fetch(`api/tecnicos/${id}`, { method: 'DELETE' });
            this.loadTechniciansView();
        } catch (e) { alert('Erro ao excluir: ' + e.message); }
    }



    async searchLocados() {
        const term = document.getElementById('locadosSearch').value.toLowerCase();
        const clientId = document.getElementById('agendaClient').value;
        const contractId = document.getElementById('agendaContract').value;
        const tbody = document.getElementById('locadosTableBody');

        tbody.innerHTML = '<tr><td colspan="6">Carregando...</td></tr>';

        try {
            // Fetch all agendamentos (filtered by client/contract if selected)
            let url = 'api/agendamentos?';
            if (clientId) url += `cliente=${clientId}&`;
            if (contractId) url += `contrato=${contractId}`;

            const data = await (await fetch(url)).json();

            // Filter by Term (Serial or Desc)
            const filtered = data.filter(item => {
                if (!term) return true;
                const serial = (item.NUMERO_SERIE || '').toLowerCase();
                const desc = (item.ativo_desc || item.ATIVO_DESC || '').toLowerCase();
                return serial.includes(term) || desc.includes(term);
            });

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Nenhum item encontrado.</td></tr>';
                return;
            }

            let html = '';
            filtered.forEach(item => {
                html += `<tr>
                    <td>${item.NUMERO_SERIE || '-'}</td>
                    <td>${item.ativo_desc || item.ATIVO_DESC || '-'}</td>
                    <td>${item.CLIENTE_NOME || '-'}</td>
                    <td>${item.DATA_RETIRADA ? new Date(item.DATA_RETIRADA).toLocaleDateString() : '-'}</td>
                    <td>${item.DATA_DEVOLUCAO ? new Date(item.DATA_DEVOLUCAO).toLocaleDateString() : '-'}</td>
                    <td>${item.STATUS_NOME || '-'}</td>
                </tr>`;
            });
            tbody.innerHTML = html;

        } catch (e) { console.error(e); tbody.innerHTML = '<tr><td colspan="6">Erro ao buscar locados</td></tr>'; }
    }


    // --- Specialties Management ---

    async loadSpecialtiesView() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div id="especialidades-view" class="view-section">
                <div class="header-actions">
                    <h2>Gestão de Especialidades</h2>
                    <button class="btn-primary" onclick="appManager.openSpecialtyModal()">Nova Especialidade</button>
                </div>
                <div class="card">
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nome</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="especialidadesTableBody">
                                <tr><td colspan="3">Carregando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        try {
            const res = await fetch('api/especialidades');
            const data = await res.json();
            this.renderSpecialties(data);
        } catch (e) {
            console.error(e);
            document.getElementById('especialidadesTableBody').innerHTML = '<tr><td colspan="3">Erro ao carregar especialidades.</td></tr>';
        }
    }

    renderSpecialties(data) {
        const tbody = document.getElementById('especialidadesTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">Nenhuma especialidade cadastrada.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(s => `
            <tr>
                <td>${s.ID_ESPECIALIDADE}</td>
                <td>${s.NOME}</td>
                <td>
                    <button class="btn-icon" onclick="appManager.openSpecialtyModal(${s.ID_ESPECIALIDADE}, '${s.NOME}')">✏️</button>
                    <button class="btn-icon" onclick="appManager.deleteSpecialty(${s.ID_ESPECIALIDADE})">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    openSpecialtyModal(id = null, name = '') {
        const modal = document.getElementById('specialtyModal');
        const title = document.getElementById('specialtyModalTitle');
        const form = document.getElementById('specialtyForm');

        form.reset();
        document.getElementById('specId').value = '';

        if (id) {
            title.textContent = 'Editar Especialidade';
            document.getElementById('specId').value = id;
            document.getElementById('specName').value = name;
        } else {
            title.textContent = 'Nova Especialidade';
        }

        modal.classList.add('active');
    }

    async saveSpecialty() {
        const id = document.getElementById('specId').value;
        const NOME = document.getElementById('specName').value;

        if (!NOME) return alert('Nome é obrigatório');

        const method = id ? 'PUT' : 'POST';
        const url = id ? `api/especialidades/${id}` : 'api/especialidades';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ NOME })
            });
            if (res.ok) {
                this.closeModal('specialtyModal');
                this.loadSpecialtiesView();
                alert('Especialidade salva!');
            } else {
                alert('Erro ao salvar.');
            }
        } catch (e) { alert('Erro: ' + e.message); }
    }

    async deleteSpecialty(id) {
        if (!confirm('Excluir especialidade?')) return;
        try {
            await fetch(`api/especialidades/${id}`, { method: 'DELETE' });
            this.loadSpecialtiesView();
        } catch (e) { alert('Erro: ' + e.message); }
    }



    // --- REPORTS MODULE ---

    async loadReportsView() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div id="reports-view" class="view-section">
                <div class="header-actions">
                    <h2>Relatórios</h2>
                </div>
                <div class="reports-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; padding: 20px;">
                    <!-- Report Card: All Clients -->
                    <div class="card report-card" onclick="appManager.generateReport('clients')" style="cursor: pointer; transition: transform 0.2s; border: 1px solid var(--border-color);">
                        <div class="card-body" style="text-align: center; padding: 20px;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">👥</div>
                            <h3>Todos os Clientes</h3>
                            <p style="color: var(--text-secondary);">Listagem completa</p>
                        </div>
                    </div>

                    <!-- Report Card: Assets by Client -->
                    <div class="card report-card" onclick="appManager.openReportModal('assetsByClient')" style="cursor: pointer; transition: transform 0.2s; border: 1px solid var(--border-color);">
                        <div class="card-body" style="text-align: center; padding: 20px;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">📦</div>
                            <h3>Ativos por Cliente</h3>
                            <p style="color: var(--text-secondary);">Filtrado por cliente</p>
                        </div>
                    </div>

                    <!-- Report Card: Active Contracts -->
                    <div class="card report-card" onclick="appManager.generateReport('activeContracts')" style="cursor: pointer; transition: transform 0.2s; border: 1px solid var(--border-color);">
                        <div class="card-body" style="text-align: center; padding: 20px;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">✅</div>
                            <h3>Contratos Ativos</h3>
                            <p style="color: var(--text-secondary);">Em vigência</p>
                        </div>
                    </div>

                    <!-- Report Card: Inactive Contracts -->
                    <div class="card report-card" onclick="appManager.generateReport('inactiveContracts')" style="cursor: pointer; transition: transform 0.2s; border: 1px solid var(--border-color);">
                        <div class="card-body" style="text-align: center; padding: 20px;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">🚫</div>
                            <h3>Contratos Inativos</h3>
                            <p style="color: var(--text-secondary);">Cancelados ou Finalizados</p>
                        </div>
                    </div>

                    <!-- Report Card: Technicians -->
                    <div class="card report-card" onclick="appManager.generateReport('technicians')" style="cursor: pointer; transition: transform 0.2s; border: 1px solid var(--border-color);">
                        <div class="card-body" style="text-align: center; padding: 20px;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">🔧</div>
                            <h3>Todos os Técnicos</h3>
                            <p style="color: var(--text-secondary);">Com dados de contato</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async generateReport(type) {
        let html = '';
        let title = '';

        try {
            if (type === 'clients') {
                const res = await fetch('api/clientes');
                const clients = await res.json();
                title = 'Relatório de Clientes';
                html = `
                    <style>
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        h1 { font-family: sans-serif; }
                        .print-btn { margin-bottom: 20px; padding: 10px 20px; cursor: pointer; }
                        @media print { .print-btn { display: none; } }
                    </style>
                    <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
                    <h1>${title}</h1>
                    <p>Total de Registros: ${clients.length}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nome / Razão Social</th>
                                <th>CPF / CNPJ</th>
                                <th>Telefone</th>
                                <th>Email</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${clients.map(c => `
                                <tr>
                                    <td>${c.ID_CLIENTE}</td>
                                    <td>${c.NOME_RAZAO}</td>
                                    <td>${c.CPF_CNPJ || '-'}</td>
                                    <td>${c.TELEFONE || '-'}</td>
                                    <td>${c.EMAIL || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else if (type === 'activeContracts' || type === 'inactiveContracts') {
                const res = await fetch('api/contratos');
                const contracts = await res.json();
                const isActive = type === 'activeContracts';
                // Filter
                const filtered = contracts.filter(c => {
                    const status = (c.STATUS_NOME || c.STATUS || '').toLowerCase();
                    return isActive ? status === 'ativo' : status !== 'ativo';
                });

                title = isActive ? 'Relatório de Contratos Ativos' : 'Relatório de Contratos Inativos';
                html = `
                    <style>
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        h1 { font-family: sans-serif; }
                        .print-btn { margin-bottom: 20px; padding: 10px 20px; cursor: pointer; }
                        @media print { .print-btn { display: none; } }
                    </style>
                    <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
                    <h1>${title}</h1>
                    <p>Total de Registros: ${filtered.length}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Cliente</th>
                                <th>Descrição</th>
                                <th>Início</th>
                                <th>Fim</th>
                                <th>Valor</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.map(c => `
                                <tr>
                                    <td>${c.ID_CONTRATO}</td>
                                    <td>${c.NOME_RAZAO || '-'}</td>
                                    <td>${c.DESCRICAO || '-'}</td>
                                    <td>${c.DATA_INICIO ? new Date(c.DATA_INICIO).toLocaleDateString() : '-'}</td>
                                    <td>${c.DATA_FIM ? new Date(c.DATA_FIM).toLocaleDateString() : '-'}</td>
                                    <td>${c.VALOR_MENSAL ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.VALOR_MENSAL) : '-'}</td>
                                    <td>${c.STATUS_NOME || c.STATUS || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else if (type === 'technicians') {
                const res = await fetch('api/tecnicos');
                const techs = await res.json();
                title = 'Relatório de Técnicos';
                html = `
                    <style>
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        h1 { font-family: sans-serif; }
                        .print-btn { margin-bottom: 20px; padding: 10px 20px; cursor: pointer; }
                        @media print { .print-btn { display: none; } }
                    </style>
                    <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
                    <h1>${title}</h1>
                    <p>Total de Registros: ${techs.length}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nome</th>
                                <th>Email</th>
                                <th>Telefone</th>
                                <th>Especialidades</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${techs.map(t => `
                                <tr>
                                    <td>${t.ID_TECNICO}</td>
                                    <td>${t.NOME}</td>
                                    <td>${t.EMAIL || '-'}</td>
                                    <td>${t.TELEFONE || '-'}</td>
                                    <td>${t.ESPECIALIDADES || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            if (html) {
                const win = window.open('', '_blank');
                win.document.write('<html><head><title>' + title + '</title></head><body>');
                win.document.write(html);
                win.document.write('</body></html>');
                win.document.close();
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao gerar relatório: ' + e.message);
        }
    }

    async openReportModal(type) {
        if (type === 'assetsByClient') {
            const modal = document.getElementById('reportFilterModal');
            const select = document.getElementById('reportClientSelect');

            // Load Clients
            try {
                select.innerHTML = '<option value="">Carregando...</option>';
                const res = await fetch('api/clientes');
                const clients = await res.json();
                select.innerHTML = '<option value="">Selecione um Cliente</option>';
                clients.forEach(c => select.options.add(new Option(c.NOME_RAZAO, c.ID_CLIENTE)));
            } catch (e) { console.error(e); }

            this.currentReportType = type;
            modal.classList.add('active');
        }
    }

    async generateReportWithFilter() {
        const modal = document.getElementById('reportFilterModal');
        const clientId = document.getElementById('reportClientSelect').value;
        const clientName = document.getElementById('reportClientSelect').options[document.getElementById('reportClientSelect').selectedIndex].text;

        if (!clientId) {
            alert('Selecione um cliente!');
            return;
        }

        try {
            const res = await fetch('api/ativos');
            const allAssets = await res.json();
            // Filter by owner
            const filtered = allAssets.filter(a => a.ID_CLIENTE_PROPRIETARIO == clientId);

            const title = `Relatório de Ativos - ${clientName}`;
            const html = `
                <style>
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    h1 { font-family: sans-serif; }
                    .print-btn { margin-bottom: 20px; padding: 10px 20px; cursor: pointer; }
                    @media print { .print-btn { display: none; } }
                </style>
                <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
                <h1>${title}</h1>
                <p>Proprietário: <strong>${clientName}</strong></p>
                <p>Total de Ativos: ${filtered.length}</p>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Descrição</th>
                            <th>Nº Série</th>
                            <th>Status Agora</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(a => `
                            <tr>
                                <td>${a.ID_ATIVO}</td>
                                <td>${a.DESCRICAO}</td>
                                <td>${a.NUMERO_SERIE || '-'}</td>
                                <td>${a.STATUS_NOME || a.STATUS || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            const win = window.open('', '_blank');
            win.document.write('<html><head><title>' + title + '</title></head><body>');
            win.document.write(html);
            win.document.write('</body></html>');
            win.document.close();

            this.closeModal('reportFilterModal');
        } catch (e) {
            console.error(e);
            alert('Erro ao gerar relatório: ' + e.message);
        }
    }

    // --- SETTINGS MODULE ---

    async loadSettingsView() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div id="settings-view" class="view-section">
                <div class="header-actions">
                    <h2>Configurações do Sistema</h2>
                </div>
                <div class="card" style="max-width: 600px; margin-top: 20px;">
                    <h3>Personalização</h3>
                    <div class="form-group" style="margin-top: 20px;">
                        <label>Logo do Sistema (Login e Barra Lateral)</label>
                        <div style="display: flex; gap: 20px; align-items: flex-start; margin-top: 10px;">
                            <div style="border: 1px dashed #ccc; padding: 10px; border-radius: 8px; text-align: center;">
                                <img id="settingsCurrentLogo" src="logo.png" alt="Logo Atual" style="max-height: 80px; max-width: 150px; display: block; margin-bottom: 5px;">
                                <small style="color: var(--text-secondary)">Atual</small>
                            </div>
                            <div style="flex: 1;">
                                <input type="file" id="logoInput" accept="image/*" class="form-control" style="margin-bottom: 10px;">
                                <div style="display: flex; gap: 10px;">
                                    <button class="btn-primary" onclick="appManager.uploadLogo()">Salvar Logo</button>
                                    <span id="uploadStatus" style="font-size: 0.9rem; align-self: center;"></span>
                                </div>
                                <p style="margin-top: 10px; font-size: 0.85rem; color: var(--text-secondary);">
                                    Recomendado: Imagem PNG ou JPG, fundo transparente.<br>
                                    A imagem será redimensionada automaticamente na exibição.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card" style="max-width: 600px; margin-top: 20px;">
                    <h3>Banco de Dados (Firebird)</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9em; margin-bottom: 15px;">Configure o acesso ao banco de dados.</p>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 2;">
                            <label>Host (IP)</label>
                            <input type="text" id="dbHost" class="form-control" placeholder="127.0.0.1">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Porta</label>
                            <input type="text" id="dbPort" class="form-control" placeholder="3050">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Caminho do Arquivo (FDB)</label>
                        <div style="display: flex; gap: 5px;">
                            <input type="text" id="dbPath" class="form-control" placeholder="C:\Caminho\Banco.FDB" style="flex:1;">
                            <button class="btn-secondary" onclick="appManager.openFileBrowser()" title="Procurar Arquivo">
                                📁
                            </button>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>Usuário</label>
                            <input type="text" id="dbUser" class="form-control" placeholder="SYSDBA">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Senha</label>
                            <input type="password" id="dbPass" class="form-control" placeholder="masterkey">
                        </div>
                    </div>

                    <div style="margin-top: 15px;">
                         <button class="btn-primary" onclick="appManager.saveDbConfig()">Salvar Configuração</button>
                    </div>
                </div>
            </div>

            <!-- File Browser Modal -->
            <div id="fileBrowserModal" class="modal-overlay">
                <div class="modal-window" style="max-width: 600px; height: 500px; display: flex; flex-direction: column;">
                    <div class="modal-header">
                        <h2>Selecionar Arquivo de Banco de Dados</h2>
                        <button class="close-modal" onclick="document.getElementById('fileBrowserModal').classList.remove('active')">&times;</button>
                    </div>
                    <div class="modal-body" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 0;">
                        <div style="padding: 10px; background: #f5f5f5; border-bottom: 1px solid #ddd; display: flex; gap: 10px;">
                            <button class="btn-sm" onclick="appManager.browseUp()">⬆️ Subir</button>
                            <input type="text" id="browserCurrentPath" class="form-control" readonly style="font-size: 0.9em; color: #666;">
                        </div>
                        <div id="fileBrowserList" style="flex: 1; overflow-y: auto; padding: 10px;">
                            <!-- Items -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="document.getElementById('fileBrowserModal').classList.remove('active')">Cancelar</button>
                    </div>
                </div>
            </div>
        `;

        // Add timestamp to current logo to avoid cache
        const settingsLogo = document.getElementById('settingsCurrentLogo');
        if (settingsLogo) settingsLogo.src = 'logo.png?v=' + new Date().getTime();

        // Load DB Config
        this.loadDbConfig();
    }

    // --- FILE BROWSER LOGIC ---

    async openFileBrowser() {
        const modal = document.getElementById('fileBrowserModal');
        modal.classList.add('active');

        let currentPath = document.getElementById('dbPath').value;
        // If empty or invalid, default to C:\
        if (!currentPath || currentPath.trim() === '') currentPath = 'C:\\';

        // If it's a file, get directory
        if (currentPath.toLowerCase().endsWith('.fdb')) {
            currentPath = currentPath.substring(0, currentPath.lastIndexOf('\\'));
        }

        this.browsePath(currentPath);
    }

    async browsePath(path) {
        const listContainer = document.getElementById('fileBrowserList');
        const pathInput = document.getElementById('browserCurrentPath');

        listContainer.innerHTML = '<div style="padding: 20px; text-align: center;">Carregando...</div>';

        try {
            // Encode path for URL
            const res = await fetch(`api/config/fs?path=${encodeURIComponent(path)}`);
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            pathInput.value = data.current;
            listContainer.innerHTML = '';

            // Add items
            if (data.items.length === 0) {
                listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Pasta vazia (apenas pastas e .FDB são mostrados)</div>';
                return;
            }

            const ul = document.createElement('ul');
            ul.style.listStyle = 'none';
            ul.style.padding = '0';

            data.items.forEach(item => {
                const li = document.createElement('li');
                li.style.padding = '8px 10px';
                li.style.borderBottom = '1px solid #eee';
                li.style.cursor = 'pointer';
                li.onmouseover = () => li.style.background = '#f0f7ff';
                li.onmouseout = () => li.style.background = 'transparent';

                if (item.isDirectory) {
                    li.innerHTML = `📁 <b>${item.name}</b>`;
                    li.onclick = () => this.browsePath(item.path);
                } else {
                    li.innerHTML = `📄 ${item.name} <span style="font-size:0.8em; color:green; margin-left:10px;">[SELECIONAR]</span>`;
                    li.onclick = () => this.selectDbFile(item.path);
                }
                ul.appendChild(li);
            });
            listContainer.appendChild(ul);

        } catch (e) {
            listContainer.innerHTML = `<div style="padding: 20px; color: red;">Erro: ${e.message}</div>`;
            // If error (e.g. permission), try root C:\
            if (path !== 'C:\\') this.browsePath('C:\\');
        }
    }

    browseUp() {
        let current = document.getElementById('browserCurrentPath').value;
        // Simple logic to find parent
        if (current.endsWith('\\')) current = current.slice(0, -1);
        const lastSlash = current.lastIndexOf('\\');
        if (lastSlash > 0) {
            const parent = current.substring(0, lastSlash) || 'C:\\'; // Default to C:\ if empty
            this.browsePath(parent + '\\'); // Ensure trailing slash for root logic if needed
        } else {
            this.browsePath('C:\\');
        }
    }

    selectDbFile(fullPath) {
        document.getElementById('dbPath').value = fullPath;
        document.getElementById('fileBrowserModal').classList.remove('active');
    }


    async loadDbConfig() {
        try {
            const res = await fetch('api/config/db');
            const config = await res.json();

            document.getElementById('dbHost').value = config.host;
            document.getElementById('dbPort').value = config.port;
            document.getElementById('dbPath').value = config.database;
            document.getElementById('dbUser').value = config.user;
            document.getElementById('dbPass').value = config.password;
        } catch (e) { console.error('Error loading DB config', e); }
    }

    async saveDbConfig() {
        if (!confirm('Tem certeza? Alterar isso pode fazer o sistema parar de conectar no banco.')) return;

        const data = {
            host: document.getElementById('dbHost').value,
            port: document.getElementById('dbPort').value,
            database: document.getElementById('dbPath').value,
            user: document.getElementById('dbUser').value,
            password: document.getElementById('dbPass').value
        };

        try {
            const res = await fetch('api/config/db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                alert(result.message);
            } else {
                alert('Erro: ' + result.message);
            }
        } catch (e) {
            alert('Erro ao salvar: ' + e.message);
        }
    }


    async uploadLogo() {
        const input = document.getElementById('logoInput');
        const status = document.getElementById('uploadStatus');

        if (!input.files || !input.files[0]) {
            alert('Selecione uma imagem primeiro!');
            return;
        }

        const formData = new FormData();
        formData.append('logo', input.files[0]);

        status.textContent = 'Enviando...';
        status.style.color = 'var(--text-info)';

        try {
            const res = await fetch('api/config/logo', {
                method: 'POST',
                body: formData // No Content-Type header, fetch adds it with boundary
            });
            const result = await res.json();

            if (result.success) {
                status.textContent = 'Sucesso!';
                status.style.color = 'green';

                // Force refresh images
                const timestamp = new Date().getTime();

                // Sidebar Logo
                const sidebarLogo = document.querySelector('.sidebar-logo');
                if (sidebarLogo) sidebarLogo.src = 'logo.png?v=' + timestamp;

                // Settings Preview Logo
                const settingsLogo = document.getElementById('settingsCurrentLogo');
                if (settingsLogo) settingsLogo.src = 'logo.png?v=' + timestamp;

                alert('Logo atualizada com sucesso!');
            } else {
                throw new Error(result.message || 'Erro no upload');
            }
        } catch (e) {
            console.error(e);
            status.textContent = 'Erro ao enviar.';
            status.style.color = 'red';
            alert('Falha: ' + e.message);
        }
    }

}

document.addEventListener('DOMContentLoaded', () => {
    window.appManager = new AppManager();
});
