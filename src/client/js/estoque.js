
class EstoqueManager {
    constructor() {
        this.currentTab = 'produtos';
        this.currentFornTab = 'basics';
        this.currentFornId = null;
    }

    async init() {
        console.log("Estoque Manager Initialized");
        if (this.currentTab === 'produtos') await this.loadProdutos();
        else if (this.currentTab === 'fornecedores') await this.loadFornecedores();
        else if (this.currentTab === 'movimentacoes') await this.loadMovimentacoes();
    }

    getTemplate() {
        return `
            <div id="estoque-view" class="view-section">
                <div class="card">
                    <div class="card-header" style="flex-wrap: wrap; gap: 10px;">
                        <h2>Controle de Estoque</h2>
                        <div class="header-actions">
                            <div class="btn-group">
                                <button class="btn-sm active" onclick="estoqueManager.switchTab('produtos')">Produtos</button>
                                <button class="btn-sm" onclick="estoqueManager.switchTab('fornecedores')">Fornecedores</button>
                                <button class="btn-sm" onclick="estoqueManager.switchTab('movimentacoes')">Movimentações</button>
                            </div>
                            <button id="btnNovoEstoque" class="btn-primary" onclick="estoqueManager.openProdutoModal()">Novo Produto</button>
                            <button id="btnNovoForn" class="btn-primary" style="display:none" onclick="estoqueManager.openFornecedorModal()">Novo Fornecedor</button>
                        </div>
                    </div>

                    <!-- Aba de Produtos -->
                    <div id="estoque-produtos-tab" class="tab-content active">
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Produto</th>
                                        <th>Unidade</th>
                                        <th>Fornecedor</th>
                                        <th>Preço Venda</th>
                                        <th>Saldo Atual</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="produtosTableBody">
                                    <tr><td colspan="6" style="text-align:center">Carregando produtos...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Aba de Fornecedores -->
                    <div id="estoque-fornecedores-tab" class="tab-content" style="display: none;">
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Razão Social</th>
                                        <th>Fantasia</th>
                                        <th>CNPJ</th>
                                        <th>Cidade/UF</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="fornecedoresTableBody">
                                    <tr><td colspan="5" style="text-align:center">Carregando fornecedores...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Aba de Movimentações -->
                    <div id="estoque-movimentacoes-tab" class="tab-content" style="display: none;">
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Data/Hora</th>
                                        <th>Produto</th>
                                        <th>Tipo</th>
                                        <th>Qtd</th>
                                        <th>Motivo</th>
                                        <th>Usuário</th>
                                    </tr>
                                </thead>
                                <tbody id="movimentacoesTableBody">
                                    <tr><td colspan="6" style="text-align:center">Carregando movimentações...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    switchTab(tab) {
        this.currentTab = tab;

        // Update Buttons
        const buttons = document.querySelectorAll('#estoque-view .btn-group .btn-sm');
        buttons.forEach(btn => {
            if (btn.textContent.toLowerCase().includes(tab)) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Update Content
        document.getElementById('estoque-produtos-tab').style.display = tab === 'produtos' ? 'block' : 'none';
        document.getElementById('estoque-fornecedores-tab').style.display = tab === 'fornecedores' ? 'block' : 'none';
        document.getElementById('estoque-movimentacoes-tab').style.display = tab === 'movimentacoes' ? 'block' : 'none';

        // Show/Hide Novo buttons
        const btnEstoque = document.getElementById('btnNovoEstoque');
        const btnForn = document.getElementById('btnNovoForn');
        if (btnEstoque) btnEstoque.style.display = tab === 'produtos' ? 'block' : 'none';
        if (btnForn) btnForn.style.display = tab === 'fornecedores' ? 'block' : 'none';

        if (tab === 'produtos') this.loadProdutos();
        else if (tab === 'fornecedores') this.loadFornecedores();
        else if (tab === 'movimentacoes') this.loadMovimentacoes();
    }

    // --- PRODUTOS ---

    async loadProdutos() {
        try {
            console.log("Chamando fetch api/produtos...");
            const res = await fetch('api/produtos');
            console.log("Resposta fetch api/produtos recebida:", res.status);
            const data = await res.json();
            console.log("Dados extraídos de api/produtos:", data);
            this.renderProdutos(data);
        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
        }
    }

    renderProdutos(data) {
        console.log("Renderizando produtos, data:", data);
        const tbody = document.getElementById('produtosTableBody');
        console.log("tbody encontrado:", !!tbody);
        if (!tbody) return;

        if (data.length === 0) {
            console.log("Nenhum produto para renderizar.");
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Nenhum produto cadastrado.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(p => `
            <tr>
                <td>${p.NOME}</td>
                <td>${p.UNIDADE}</td>
                <td>${p.FORNECEDOR_NOME || '-'}</td>
                <td>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.PRECO_VENDA)}</td>
                <td style="font-weight: bold; color: ${p.SALDO_ATUAL > 0 ? 'green' : (p.SALDO_ATUAL < 0 ? 'red' : 'inherit')}">
                    ${p.SALDO_ATUAL}
                </td>
                <td>
                    <button class="btn-icon" title="Movimentar" onclick="estoqueManager.openMovimentacaoModal(${p.ID_PRODUTO}, '${p.NOME}')">🔄</button>
                    <button class="btn-icon" title="Editar" onclick="estoqueManager.openProdutoModal('${encodeURIComponent(JSON.stringify(p))}')">✏️</button>
                    <button class="btn-icon" title="Excluir" onclick="estoqueManager.deleteProduto(${p.ID_PRODUTO})">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    async openProdutoModal(dataStr = null) {
        const modal = document.getElementById('produtoModal');
        const title = document.getElementById('produtoModalTitle');
        const form = document.getElementById('produtoForm');

        form.reset();
        document.getElementById('produtoId').value = '';
        title.textContent = 'Novo Produto';

        await this.loadFornSelect();

        if (dataStr) {
            const p = JSON.parse(decodeURIComponent(dataStr));
            title.textContent = 'Editar Produto';
            document.getElementById('produtoId').value = p.ID_PRODUTO;
            document.getElementById('produtoNome').value = p.NOME;
            document.getElementById('produtoDesc').value = p.DESCRICAO || '';
            document.getElementById('produtoUnidade').value = p.UNIDADE || 'UN';
            document.getElementById('produtoQtde').value = p.SALDO_ATUAL || 0;
            document.getElementById('produtoQtde').disabled = true; // Não altera saldo por aqui
            document.getElementById('produtoPreco').value = p.PRECO_VENDA || 0;
            document.getElementById('produtoDataCompra').value = p.DATA_COMPRA ? p.DATA_COMPRA.split('T')[0] : '';
            document.getElementById('produtoNF').value = p.NUMERO_NF || '';
            document.getElementById('produtoFornecedor').value = p.ID_FORNECEDOR || '';
        } else {
            document.getElementById('produtoQtde').value = 0;
            document.getElementById('produtoQtde').disabled = false;
        }

        modal.classList.add('active');
    }

    async loadFornSelect() {
        const select = document.getElementById('produtoFornecedor');
        try {
            const res = await fetch('api/fornecedores');
            const data = await res.json();
            select.innerHTML = '<option value="">Selecione...</option>' +
                data.map(f => `<option value="${f.ID_FORNECEDOR}">${f.RAZAO_SOCIAL}</option>`).join('');
        } catch (e) {
            console.error("Erro ao carregar select de fornecedores", e);
        }
    }

    async saveProduto() {
        const id = document.getElementById('produtoId').value;
        const data = {
            NOME: document.getElementById('produtoNome').value,
            DESCRICAO: document.getElementById('produtoDesc').value,
            UNIDADE: document.getElementById('produtoUnidade').value,
            SALDO_INICIAL: parseFloat(document.getElementById('produtoQtde').value) || 0,
            PRECO_VENDA: parseFloat(document.getElementById('produtoPreco').value) || 0,
            DATA_COMPRA: document.getElementById('produtoDataCompra').value || null,
            NUMERO_NF: document.getElementById('produtoNF').value || null,
            ID_FORNECEDOR: document.getElementById('produtoFornecedor').value || null
        };

        if (!data.NOME) {
            alert("O nome do produto é obrigatório.");
            return;
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `api/produtos/${id}` : 'api/produtos';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (result.success || result.id) {
                appManager.closeModal('produtoModal');
                this.loadProdutos();
            } else {
                alert("Erro ao salvar produto: " + (result.error || 'Erro desconhecido'));
            }
        } catch (error) {
            alert("Erro ao salvar produto: " + error.message);
        }
    }

    async deleteProduto(id) {
        if (!confirm("Deseja realmente excluir este produto?")) return;
        try {
            const res = await fetch(`api/produtos/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) this.loadProdutos();
            else alert("Erro ao excluir: " + result.error);
        } catch (error) {
            alert("Erro ao excluir: " + error.message);
        }
    }

    // --- FORNECEDORES ---

    async loadFornecedores() {
        try {
            const res = await fetch('api/fornecedores');
            const data = await res.json();
            this.renderFornecedores(data);
        } catch (error) {
            console.error("Erro ao carregar fornecedores:", error);
        }
    }

    renderFornecedores(data) {
        const tbody = document.getElementById('fornecedoresTableBody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Nenhum fornecedor cadastrado.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(f => `
            <tr>
                <td>${f.RAZAO_SOCIAL}</td>
                <td>${f.NOME_FANTASIA || '-'}</td>
                <td>${f.CNPJ || '-'}</td>
                <td>${f.CIDADE || '-'}/${f.UF || '-'}</td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="estoqueManager.openFornecedorModal('${encodeURIComponent(JSON.stringify(f))}')">✏️</button>
                    <button class="btn-icon" title="Excluir" onclick="estoqueManager.deleteFornecedor(${f.ID_FORNECEDOR})">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    openFornecedorModal(dataStr = null) {
        const modal = document.getElementById('fornecedorModal');
        const title = document.getElementById('fornecedorModalTitle');
        const form = document.getElementById('fornecedorForm');

        form.reset();
        this.currentFornId = null;
        document.getElementById('fornecedorId').value = '';
        title.textContent = 'Novo Fornecedor';
        this.switchFornecedorTab('basics');

        if (dataStr) {
            const f = JSON.parse(decodeURIComponent(dataStr));
            title.textContent = 'Editar Fornecedor';
            this.currentFornId = f.ID_FORNECEDOR;
            document.getElementById('fornecedorId').value = f.ID_FORNECEDOR;
            document.getElementById('fornRazao').value = f.RAZAO_SOCIAL;
            document.getElementById('fornFantasia').value = f.NOME_FANTASIA || '';
            document.getElementById('fornCnpj').value = f.CNPJ || '';
            document.getElementById('fornIE').value = f.IE || '';
            document.getElementById('fornIM').value = f.IM || '';
            document.getElementById('fornEndereco').value = f.ENDERECO || '';
            document.getElementById('fornNumero').value = f.NUMERO || '';
            document.getElementById('fornBairro').value = f.BAIRRO || '';
            document.getElementById('fornCidade').value = f.CIDADE || '';
            document.getElementById('fornUF').value = f.UF || '';
            document.getElementById('fornCep').value = f.CEP || '';
        }

        modal.classList.add('active');
    }

    switchFornecedorTab(tab) {
        this.currentFornTab = tab;
        const buttons = document.querySelectorAll('#fornecedorModal .tab-btn');
        buttons.forEach(btn => {
            if (btn.textContent.toLowerCase().includes(tab === 'basics' ? 'dados' : 'contatos')) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        document.getElementById('tab-forn-basics').style.display = tab === 'basics' ? 'block' : 'none';
        document.getElementById('tab-forn-contacts').style.display = tab === 'contacts' ? 'block' : 'none';

        if (tab === 'contacts') {
            if (this.currentFornId) this.loadFornContacts();
            else document.getElementById('fornContactsBody').innerHTML = '<tr><td colspan="4" style="text-align:center">Salve o fornecedor primeiro para adicionar contatos.</td></tr>';
        }
    }

    async saveFornecedor() {
        const id = document.getElementById('fornecedorId').value;
        const data = {
            RAZAO_SOCIAL: document.getElementById('fornRazao').value,
            NOME_FANTASIA: document.getElementById('fornFantasia').value,
            CNPJ: document.getElementById('fornCnpj').value,
            IE: document.getElementById('fornIE').value,
            IM: document.getElementById('fornIM').value,
            ENDERECO: document.getElementById('fornEndereco').value,
            NUMERO: document.getElementById('fornNumero').value,
            BAIRRO: document.getElementById('fornBairro').value,
            CIDADE: document.getElementById('fornCidade').value,
            UF: document.getElementById('fornUF').value,
            CEP: document.getElementById('fornCep').value
        };

        if (!data.RAZAO_SOCIAL) {
            alert("A razão social é obrigatória.");
            return;
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `api/fornecedores/${id}` : 'api/fornecedores';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (result.success || result.id) {
                if (!id) this.currentFornId = result.id;
                else this.currentFornId = id;
                document.getElementById('fornecedorId').value = this.currentFornId;
                alert("Fornecedor salvo com sucesso!");
                this.loadFornecedores();
            } else {
                alert("Erro ao salvar fornecedor: " + (result.error || result.message || "Erro desconhecido"));
            }
        } catch (error) {
            alert("Erro: " + error.message);
        }
    }

    async deleteFornecedor(id) {
        if (!confirm("Deseja realmente excluir este fornecedor?")) return;
        try {
            const res = await fetch(`api/fornecedores/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) this.loadFornecedores();
            else alert("Erro ao excluir.");
        } catch (error) {
            alert("Erro: " + error.message);
        }
    }

    // --- CONTATOS FORNECEDOR ---

    async loadFornContacts() {
        if (!this.currentFornId) return;
        try {
            const res = await fetch(`api/fornecedores/${this.currentFornId}/contatos`);
            const data = await res.json();
            const tbody = document.getElementById('fornContactsBody');
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Nenhum contato cadastrado.</td></tr>';
                return;
            }
            tbody.innerHTML = data.map(c => `
                <tr>
                    <td>${c.NOME}</td>
                    <td>${c.EMAIL || '-'}</td>
                    <td>${c.CELULAR || '-'}</td>
                    <td>
                        <button class="btn-icon" onclick="estoqueManager.deleteContatoFornecedor(${c.ID_CONTATO})">🗑️</button>
                    </td>
                </tr>
            `).join('');
        } catch (e) { console.error(e); }
    }

    openContatoFornecedorModal() {
        if (!this.currentFornId) {
            alert("Salve o fornecedor primeiro.");
            return;
        }
        const modal = document.getElementById('contatoFornecedorModal');
        const form = document.getElementById('contatoFornecedorForm');
        form.reset();
        document.getElementById('contatoFornId').value = '';
        document.getElementById('contatoFornFornecedorId').value = this.currentFornId;
        modal.classList.add('active');
    }

    async saveContatoFornecedor() {
        const idFornecedor = document.getElementById('contatoFornFornecedorId').value;
        const data = {
            ID_FORNECEDOR: idFornecedor,
            NOME: document.getElementById('contatoFornNome').value,
            EMAIL: document.getElementById('contatoFornEmail').value,
            CELULAR: document.getElementById('contatoFornCelular').value
        };

        if (!data.NOME) return alert("Informe o nome.");

        try {
            const res = await fetch('api/contatos-fornecedor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success || result.id) {
                appManager.closeModal('contatoFornecedorModal');
                this.loadFornContacts();
            }
        } catch (e) { alert(e.message); }
    }

    async deleteContatoFornecedor(id) {
        if (!confirm("Excluir contato?")) return;
        try {
            await fetch(`api/contatos-fornecedor/${id}`, { method: 'DELETE' });
            this.loadFornContacts();
        } catch (e) { alert(e.message); }
    }

    // --- MOVIMENTAÇÕES ---

    async loadMovimentacoes() {
        try {
            const res = await fetch('api/movimentacoes');
            const data = await res.json();
            this.renderMovimentacoes(data);
        } catch (error) {
            console.error("Erro ao carregar movimentações:", error);
        }
    }

    renderMovimentacoes(data) {
        const tbody = document.getElementById('movimentacoesTableBody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Nenhuma movimentação registrada.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(m => `
            <tr>
                <td>${new Date(m.DATA_MOV).toLocaleString()}</td>
                <td>${m.PRODUTO_NOME}</td>
                <td><span class="badge ${m.TIPO === 'E' ? 'success' : 'danger'}">${m.TIPO === 'E' ? 'Entrada' : 'Saída'}</span></td>
                <td>${m.QUANTIDADE}</td>
                <td>${m.MOTIVO || '-'}</td>
                <td>${m.USUARIO_NOME || '-'}</td>
            </tr>
        `).join('');
    }

    openMovimentacaoModal(produtoId, produtoNome) {
        const modal = document.getElementById('movimentacaoModal');
        const form = document.getElementById('movimentacaoForm');

        form.reset();
        document.getElementById('movProdutoId').value = produtoId;
        document.getElementById('movProdutoNome').value = produtoNome;

        modal.classList.add('active');
    }

    async saveMovimentacao() {
        const user = JSON.parse(localStorage.getItem('user'));
        const data = {
            ID_PRODUTO: document.getElementById('movProdutoId').value,
            TIPO: document.getElementById('movTipo').value,
            QUANTIDADE: parseFloat(document.getElementById('movQtd').value),
            MOTIVO: document.getElementById('movMotivo').value,
            ID_USUARIO: user ? (user.ID_USUARIO || user.id) : null
        };

        if (!data.QUANTIDADE || data.QUANTIDADE <= 0) {
            alert("Informe uma quantidade válida.");
            return;
        }

        try {
            const res = await fetch('api/movimentacoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (result.success) {
                appManager.closeModal('movimentacaoModal');
                this.loadProdutos();
            } else {
                alert("Erro ao registrar movimentação.");
            }
        } catch (error) {
            alert("Erro: " + error.message);
        }
    }
}

// Global instance
window.estoqueManager = new EstoqueManager();
