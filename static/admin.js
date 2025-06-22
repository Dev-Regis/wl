// WebLurk Admin - Sistema de Administração
// Configurações globais
const API_BASE = '/api';
let adminAtual = null;
let adminsData = [];
let agendaData = [];

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    verificarSessaoAdmin();
    configurarEventListeners();
});

// Configurar event listeners
function configurarEventListeners() {
    // Form de login
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        realizarLogin();
    });
    
    // Enter nos campos de login
    document.getElementById('loginInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            realizarLogin();
        }
    });
    
    document.getElementById('passwordInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            realizarLogin();
        }
    });
    
    // Enter nos campos de novo admin
    document.getElementById('newAdminLogin').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('newAdminPassword').focus();
        }
    });
    
    document.getElementById('newAdminPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            createAdmin();
        }
    });
}

// Verificar sessão do administrador
async function verificarSessaoAdmin() {
    try {
        const response = await fetch(`${API_BASE}/admin/verificar-sessao`);
        const data = await response.json();
        
        if (data.logado) {
            adminAtual = data.admin;
            mostrarDashboard();
            carregarAdministradores();
        } else {
            mostrarLogin();
        }
    } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        mostrarLogin();
    }
}

// Realizar login
async function realizarLogin() {
    const login = document.getElementById('loginInput').value.trim();
    const senha = document.getElementById('passwordInput').value.trim();
    
    if (!login || !senha) {
        mostrarNotificacao('Por favor, preencha todos os campos', 'error');
        return;
    }
    
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ login, senha })
        });
        
        const data = await response.json();
        
        if (data.success) {
            adminAtual = data.admin;
            mostrarNotificacao(data.message, 'success');
            setTimeout(() => {
                mostrarDashboard();
                carregarAdministradores();
            }, 1000);
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        mostrarNotificacao('Erro ao realizar login', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Logout
async function logout() {
    try {
        await fetch(`${API_BASE}/admin/logout`, {
            method: 'POST'
        });
        
        adminAtual = null;
        mostrarLogin();
        mostrarNotificacao('Logout realizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro no logout:', error);
        mostrarLogin();
    }
}

// Mostrar tela de login
function mostrarLogin() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('dashboardContainer').style.display = 'none';
    
    // Limpar campos
    document.getElementById('loginInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('loginInput').focus();
}

// Mostrar dashboard
function mostrarDashboard() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('dashboardContainer').style.display = 'block';
    
    // Atualizar nome do admin
    document.getElementById('adminName').textContent = adminAtual.login;
    
    // Mostrar seção de administradores por padrão
    showSection('admins');
}

// Mostrar seção específica
function showSection(section) {
    // Esconder todas as seções
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(s => s.style.display = 'none');
    
    // Mostrar seção selecionada
    document.getElementById(section + 'Section').style.display = 'block';
    
    // Carregar dados da seção
    switch(section) {
        case 'admins':
            carregarAdministradores();
            break;
        case 'agenda':
            carregarAgenda();
            break;
        case 'ranking':
            carregarRanking();
            break;
        case 'online':
            carregarUsuariosOnline();
            break;
    }
}

// Carregar lista de administradores
async function carregarAdministradores() {
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/admin/listar-admins`);
        const data = await response.json();
        
        if (data.success) {
            adminsData = data.admins;
            renderizarTabelaAdmins();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar administradores:', error);
        mostrarNotificacao('Erro ao carregar administradores', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Renderizar tabela de administradores
function renderizarTabelaAdmins() {
    const tbody = document.getElementById('adminsTableBody');
    tbody.innerHTML = '';
    
    adminsData.forEach(admin => {
        const row = document.createElement('tr');
        
        const tipoAdmin = admin.criador ? 
            '<span class="badge-creator"><i class="fas fa-crown me-1"></i>Criador</span>' :
            '<span class="badge-admin"><i class="fas fa-user-shield me-1"></i>Admin</span>';
        
        const dataFormatada = new Date(admin.data_criacao).toLocaleDateString('pt-BR');
        
        let acoes = '';
        if (admin.criador) {
            // Administrador criador - apenas alterar senha própria
            if (adminAtual.id === admin.id) {
                acoes = `
                    <button class="btn btn-warning-custom btn-sm" onclick="alterarSenha(${admin.id})">
                        <i class="fas fa-key me-1"></i>Alterar Senha
                    </button>
                `;
            } else {
                acoes = '<span class="text-muted">Protegido</span>';
            }
        } else {
            // Administrador comum
            acoes = `
                <button class="btn btn-warning-custom btn-sm me-1" onclick="alterarSenha(${admin.id})">
                    <i class="fas fa-key me-1"></i>Alterar Senha
                </button>
            `;
            
            // Só pode excluir se for criador ou o próprio admin
            if (adminAtual.criador || adminAtual.id === admin.id) {
                acoes += `
                    <button class="btn btn-danger-custom btn-sm" onclick="excluirAdmin(${admin.id}, '${admin.login}')">
                        <i class="fas fa-trash me-1"></i>Excluir
                    </button>
                `;
            }
        }
        
        row.innerHTML = `
            <td>${admin.id}</td>
            <td><strong>${admin.login}</strong></td>
            <td>${tipoAdmin}</td>
            <td>${dataFormatada}</td>
            <td>${acoes}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Mostrar formulário de criar admin
function showCreateAdminForm() {
    document.getElementById('createAdminForm').style.display = 'block';
    document.getElementById('newAdminLogin').focus();
}

// Esconder formulário de criar admin
function hideCreateAdminForm() {
    document.getElementById('createAdminForm').style.display = 'none';
    document.getElementById('newAdminLogin').value = '';
    document.getElementById('newAdminPassword').value = '';
}

// Criar novo administrador
async function createAdmin() {
    const login = document.getElementById('newAdminLogin').value.trim();
    const senha = document.getElementById('newAdminPassword').value.trim();
    
    if (!login || !senha) {
        mostrarNotificacao('Por favor, preencha todos os campos', 'error');
        return;
    }
    
    if (login.length < 3) {
        mostrarNotificacao('Login deve ter pelo menos 3 caracteres', 'error');
        return;
    }
    
    if (senha.length < 3) {
        mostrarNotificacao('Senha deve ter pelo menos 3 caracteres', 'error');
        return;
    }
    
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/admin/criar-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ login, senha })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacao(data.message, 'success');
            hideCreateAdminForm();
            carregarAdministradores();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao criar administrador:', error);
        mostrarNotificacao('Erro ao criar administrador', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Alterar senha do administrador
async function alterarSenha(adminId) {
    const novaSenha = prompt('Digite a nova senha:');
    
    if (!novaSenha) {
        return;
    }
    
    if (novaSenha.length < 3) {
        mostrarNotificacao('Senha deve ter pelo menos 3 caracteres', 'error');
        return;
    }
    
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/admin/alterar-senha`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nova_senha: novaSenha })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacao(data.message, 'success');
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        mostrarNotificacao('Erro ao alterar senha', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Excluir administrador
async function excluirAdmin(adminId, adminLogin) {
    if (!confirm(`Tem certeza que deseja excluir o administrador "${adminLogin}"?`)) {
        return;
    }
    
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/admin/excluir-admin/${adminId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacao(data.message, 'success');
            carregarAdministradores();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir administrador:', error);
        mostrarNotificacao('Erro ao excluir administrador', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Mostrar/esconder loading
function mostrarLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = show ? 'block' : 'none';
}

// Mostrar notificação
function mostrarNotificacao(mensagem, tipo = 'success') {
    const notification = document.getElementById('notification');
    
    notification.textContent = mensagem;
    notification.className = `notification ${tipo}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Carregar agenda
async function carregarAgenda() {
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/agenda/obter-agenda`);
        const data = await response.json();
        
        if (data.success) {
            agendaData = data.agenda;
            renderizarTabelaAgenda();
            atualizarEstatisticasAgenda();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar agenda:', error);
        mostrarNotificacao('Erro ao carregar agenda', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Renderizar tabela de agenda
function renderizarTabelaAgenda() {
    const tbody = document.getElementById('agendaTableBody');
    tbody.innerHTML = '';
    
    if (agendaData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-calendar-times me-2"></i>
                    Nenhum item na agenda. Faça upload de um arquivo Excel/CSV.
                </td>
            </tr>
        `;
        return;
    }
    
    agendaData.forEach(item => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${item.hora}</strong></td>
            <td>${formatarData(item.data)}</td>
            <td><strong>${item.nome_canal}</strong></td>
            <td>
                <a href="${item.link_plataforma}" target="_blank" class="text-info">
                    ${item.link_plataforma}
                </a>
            </td>
            <td>
                <button class="btn btn-danger-custom btn-sm" onclick="excluirItemAgenda(${item.id})">
                    <i class="fas fa-trash me-1"></i>Excluir
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Atualizar estatísticas da agenda
function atualizarEstatisticasAgenda() {
    const totalItens = agendaData.length;
    const horariosPreenchidos = totalItens;
    const horariosVagos = 24 - horariosPreenchidos;
    
    document.getElementById('totalItens').textContent = totalItens;
    document.getElementById('horariosPreenchidos').textContent = horariosPreenchidos;
    document.getElementById('horariosVagos').textContent = Math.max(0, horariosVagos);
}

// Upload de agenda
async function uploadAgenda() {
    const fileInput = document.getElementById('agendaFile');
    const file = fileInput.files[0];
    
    if (!file) {
        mostrarNotificacao('Por favor, selecione um arquivo', 'error');
        return;
    }
    
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
    ];
    
    if (!allowedTypes.includes(file.type)) {
        mostrarNotificacao('Formato de arquivo não suportado. Use .xlsx ou .csv', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/agenda/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacao(data.message, 'success');
            fileInput.value = '';
            carregarAgenda();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro no upload:', error);
        mostrarNotificacao('Erro ao fazer upload do arquivo', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Exportar agenda para Excel
async function exportarAgendaExcel() {
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/agenda/exportar-excel`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'agenda_weblurk.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            mostrarNotificacao('Agenda exportada com sucesso!', 'success');
        } else {
            const data = await response.json();
            mostrarNotificacao(data.message || 'Erro ao exportar agenda', 'error');
        }
    } catch (error) {
        console.error('Erro ao exportar agenda:', error);
        mostrarNotificacao('Erro ao exportar agenda', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Limpar agenda
async function limparAgenda() {
    if (!confirm('Tem certeza que deseja limpar toda a agenda? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/agenda/limpar-agenda`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacao(data.message, 'success');
            carregarAgenda();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao limpar agenda:', error);
        mostrarNotificacao('Erro ao limpar agenda', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Excluir item da agenda
async function excluirItemAgenda(itemId) {
    if (!confirm('Tem certeza que deseja excluir este item da agenda?')) {
        return;
    }
    
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/agenda/excluir-item/${itemId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacao(data.message, 'success');
            carregarAgenda();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir item:', error);
        mostrarNotificacao('Erro ao excluir item da agenda', 'error');
    } finally {
        mostrarLoading(false);
    }
}


// Utilitários
function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
}


// Variáveis globais para ranking
let rankingData = [];
let rankingFiltrado = [];
let paginaAtual = 1;
const itensPorPagina = 10;
let ordenacaoAtual = { campo: 'pontos', direcao: 'desc' };

// Carregar ranking
async function carregarRanking() {
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/ranking/obter-ranking`);
        const data = await response.json();
        
        if (data.success) {
            rankingData = data.ranking;
            rankingFiltrado = [...rankingData];
            calcularPosicoes();
            renderizarTabelaRanking();
            atualizarEstatisticasRanking();
            atualizarPaginacao();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
        mostrarNotificacao('Erro ao carregar ranking', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Calcular posições do ranking
function calcularPosicoes() {
    rankingFiltrado.sort((a, b) => b.pontos - a.pontos);
    rankingFiltrado.forEach((usuario, index) => {
        usuario.posicao = index + 1;
        usuario.media = usuario.pontos > 0 ? (usuario.pontos / Math.max(1, usuario.sessoes_lurk || 1)).toFixed(2) : '0.00';
    });
}

// Renderizar tabela de ranking
function renderizarTabelaRanking() {
    const tbody = document.getElementById('rankingTableBody');
    tbody.innerHTML = '';
    
    if (rankingFiltrado.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-trophy me-2"></i>
                    Nenhum usuário encontrado no ranking.
                </td>
            </tr>
        `;
        return;
    }
    
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const usuariosPagina = rankingFiltrado.slice(inicio, fim);
    
    usuariosPagina.forEach(usuario => {
        const row = document.createElement('tr');
        
        // Definir cor da posição
        let corPosicao = '';
        if (usuario.posicao === 1) corPosicao = 'style="color: #ffd700; font-weight: bold;"'; // Ouro
        else if (usuario.posicao === 2) corPosicao = 'style="color: #c0c0c0; font-weight: bold;"'; // Prata
        else if (usuario.posicao === 3) corPosicao = 'style="color: #cd7f32; font-weight: bold;"'; // Bronze
        
        // Status online/offline
        const statusBadge = usuario.online ? 
            '<span class="badge bg-success"><i class="fas fa-circle me-1"></i>Online</span>' :
            '<span class="badge bg-secondary"><i class="fas fa-circle me-1"></i>Offline</span>';
        
        // Tipo de janela
        const tipoJanelaBadge = usuario.tipo_janela === 'Pop-Up' ?
            '<span class="badge bg-info">Pop-Up</span>' :
            '<span class="badge bg-warning text-dark">Tab</span>';
        
        row.innerHTML = `
            <td ${corPosicao}>
                ${usuario.posicao === 1 ? '<i class="fas fa-crown me-1"></i>' : ''}
                ${usuario.posicao}
            </td>
            <td><strong>${usuario.nick_canal}</strong></td>
            <td>
                <span class="badge bg-primary fs-6">${usuario.pontos}</span>
            </td>
            <td>${usuario.media}%</td>
            <td>${statusBadge}</td>
            <td>${tipoJanelaBadge}</td>
            <td>
                <button class="btn btn-warning-custom btn-sm me-1" onclick="editarPontos('${usuario.nick_canal}', ${usuario.pontos})">
                    <i class="fas fa-edit me-1"></i>Editar
                </button>
                <button class="btn btn-danger-custom btn-sm" onclick="excluirUsuario('${usuario.nick_canal}')">
                    <i class="fas fa-trash me-1"></i>Excluir
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Atualizar estatísticas do ranking
function atualizarEstatisticasRanking() {
    const totalUsuarios = rankingData.length;
    const usuariosOnline = rankingData.filter(u => u.online).length;
    const pontosTotal = rankingData.reduce((total, u) => total + u.pontos, 0);
    const mediaPontos = totalUsuarios > 0 ? (pontosTotal / totalUsuarios).toFixed(2) : '0.00';
    
    document.getElementById('totalUsuarios').textContent = totalUsuarios;
    document.getElementById('usuariosOnline').textContent = usuariosOnline;
    document.getElementById('pontosTotal').textContent = pontosTotal;
    document.getElementById('mediaPontos').textContent = mediaPontos;
}

// Filtrar ranking
function filtrarRanking() {
    const busca = document.getElementById('searchRanking').value.toLowerCase();
    const tipoJanela = document.getElementById('filterTipoJanela').value;
    const online = document.getElementById('filterOnline').value;
    
    rankingFiltrado = rankingData.filter(usuario => {
        const matchBusca = usuario.nick_canal.toLowerCase().includes(busca);
        const matchTipo = !tipoJanela || usuario.tipo_janela === tipoJanela;
        const matchOnline = !online || usuario.online.toString() === online;
        
        return matchBusca && matchTipo && matchOnline;
    });
    
    calcularPosicoes();
    paginaAtual = 1;
    renderizarTabelaRanking();
    atualizarPaginacao();
}

// Ordenar ranking
function ordenarRanking(campo) {
    if (ordenacaoAtual.campo === campo) {
        ordenacaoAtual.direcao = ordenacaoAtual.direcao === 'asc' ? 'desc' : 'asc';
    } else {
        ordenacaoAtual.campo = campo;
        ordenacaoAtual.direcao = 'desc';
    }
    
    rankingFiltrado.sort((a, b) => {
        let valorA = a[campo];
        let valorB = b[campo];
        
        if (campo === 'media') {
            valorA = parseFloat(valorA);
            valorB = parseFloat(valorB);
        } else if (campo === 'pontos' || campo === 'posicao') {
            valorA = parseInt(valorA);
            valorB = parseInt(valorB);
        } else {
            valorA = valorA.toString().toLowerCase();
            valorB = valorB.toString().toLowerCase();
        }
        
        if (ordenacaoAtual.direcao === 'asc') {
            return valorA > valorB ? 1 : -1;
        } else {
            return valorA < valorB ? 1 : -1;
        }
    });
    
    renderizarTabelaRanking();
}

// Atualizar paginação
function atualizarPaginacao() {
    const total = rankingFiltrado.length;
    const inicio = (paginaAtual - 1) * itensPorPagina + 1;
    const fim = Math.min(paginaAtual * itensPorPagina, total);
    
    document.getElementById('rankingStart').textContent = total > 0 ? inicio : 0;
    document.getElementById('rankingEnd').textContent = fim;
    document.getElementById('rankingTotal').textContent = total;
    
    const btnAnterior = document.getElementById('btnAnterior');
    const btnProximo = document.getElementById('btnProximo');
    
    btnAnterior.disabled = paginaAtual <= 1;
    btnProximo.disabled = paginaAtual >= Math.ceil(total / itensPorPagina);
}

// Página anterior
function paginaAnterior() {
    if (paginaAtual > 1) {
        paginaAtual--;
        renderizarTabelaRanking();
        atualizarPaginacao();
    }
}

// Próxima página
function proximaPagina() {
    const totalPaginas = Math.ceil(rankingFiltrado.length / itensPorPagina);
    if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderizarTabelaRanking();
        atualizarPaginacao();
    }
}

// Editar pontos do usuário
async function editarPontos(nickCanal, pontosAtuais) {
    const novosPontos = prompt(`Editar pontos para ${nickCanal}:`, pontosAtuais);
    
    if (novosPontos === null || novosPontos === '') {
        return;
    }
    
    const pontos = parseInt(novosPontos);
    if (isNaN(pontos) || pontos < 0) {
        mostrarNotificacao('Por favor, digite um número válido de pontos', 'error');
        return;
    }
    
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/ranking/editar-pontos`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nick_canal: nickCanal, pontos: pontos })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacao(data.message, 'success');
            carregarRanking();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao editar pontos:', error);
        mostrarNotificacao('Erro ao editar pontos', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Excluir usuário do ranking
async function excluirUsuario(nickCanal) {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${nickCanal}" do ranking?`)) {
        return;
    }
    
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/ranking/excluir-usuario/${encodeURIComponent(nickCanal)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacao(data.message, 'success');
            carregarRanking();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        mostrarNotificacao('Erro ao excluir usuário', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Exportar ranking para Excel
async function exportarRankingExcel() {
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/ranking/exportar-excel`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ranking_weblurk.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            mostrarNotificacao('Ranking exportado para Excel com sucesso!', 'success');
        } else {
            const data = await response.json();
            mostrarNotificacao(data.message || 'Erro ao exportar ranking', 'error');
        }
    } catch (error) {
        console.error('Erro ao exportar ranking:', error);
        mostrarNotificacao('Erro ao exportar ranking', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Exportar ranking para CSV
async function exportarRankingCSV() {
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/ranking/exportar-csv`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ranking_weblurk.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            mostrarNotificacao('Ranking exportado para CSV com sucesso!', 'success');
        } else {
            const data = await response.json();
            mostrarNotificacao(data.message || 'Erro ao exportar ranking', 'error');
        }
    } catch (error) {
        console.error('Erro ao exportar ranking:', error);
        mostrarNotificacao('Erro ao exportar ranking', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Limpar dados do ranking
async function limparRanking() {
    if (!confirm('Tem certeza que deseja limpar todos os dados do ranking? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/ranking/limpar-dados`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacao(data.message, 'success');
            carregarRanking();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao limpar ranking:', error);
        mostrarNotificacao('Erro ao limpar ranking', 'error');
    } finally {
        mostrarLoading(false);
    }
}


// Variáveis globais para usuários online
let usuariosOnlineData = [];
let usuariosOnlineFiltrados = [];
let autoUpdateInterval = null;
let autoUpdateAtivo = false;
let intervaloAutoUpdate = 30; // segundos

// Carregar usuários online
async function carregarUsuariosOnline() {
    try {
        const response = await fetch(`${API_BASE}/weblurk/usuarios-online`);
        const data = await response.json();
        
        if (data.success) {
            usuariosOnlineData = data.usuarios;
            usuariosOnlineFiltrados = [...usuariosOnlineData];
            renderizarTabelaUsuariosOnline();
            atualizarEstatisticasOnline();
            atualizarUltimaAtualizacao();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar usuários online:', error);
        mostrarNotificacao('Erro ao carregar usuários online', 'error');
    }
}

// Renderizar tabela de usuários online
function renderizarTabelaUsuariosOnline() {
    const tbody = document.getElementById('onlineTableBody');
    const noUsersDiv = document.getElementById('noUsersOnline');
    
    tbody.innerHTML = '';
    
    if (usuariosOnlineFiltrados.length === 0) {
        noUsersDiv.style.display = 'block';
        return;
    }
    
    noUsersDiv.style.display = 'none';
    
    usuariosOnlineFiltrados.forEach(usuario => {
        const row = document.createElement('tr');
        
        // Calcular tempo online
        const tempoOnline = calcularTempoOnline(usuario.ultima_atividade);
        
        // Status do tipo de janela
        const tipoJanelaBadge = usuario.tipo_janela === 'Pop-Up' ?
            '<span class="badge bg-info"><i class="fas fa-external-link-alt me-1"></i>Pop-Up</span>' :
            '<span class="badge bg-warning text-dark"><i class="fas fa-window-maximize me-1"></i>Tab</span>';
        
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="online-indicator me-2"></div>
                    <strong>${usuario.nick_canal}</strong>
                </div>
            </td>
            <td>
                <span class="badge bg-primary fs-6">${usuario.pontos}</span>
            </td>
            <td>${tipoJanelaBadge}</td>
            <td>
                <span class="text-success">
                    <i class="fas fa-clock me-1"></i>${tempoOnline}
                </span>
            </td>
            <td>${formatarDataHora(usuario.ultima_atividade)}</td>
            <td>
                <button class="btn btn-warning-custom btn-sm me-1" onclick="desconectarUsuario('${usuario.nick_canal}')">
                    <i class="fas fa-sign-out-alt me-1"></i>Desconectar
                </button>
                <button class="btn btn-info-custom btn-sm" onclick="verDetalhesUsuario('${usuario.nick_canal}')">
                    <i class="fas fa-info-circle me-1"></i>Detalhes
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Atualizar estatísticas de usuários online
function atualizarEstatisticasOnline() {
    const totalOnline = usuariosOnlineData.length;
    const totalPopup = usuariosOnlineData.filter(u => u.tipo_janela === 'Pop-Up').length;
    const totalTab = usuariosOnlineData.filter(u => u.tipo_janela === 'Tab').length;
    
    document.getElementById('totalOnline').textContent = totalOnline;
    document.getElementById('totalPopup').textContent = totalPopup;
    document.getElementById('totalTab').textContent = totalTab;
}

// Atualizar última atualização
function atualizarUltimaAtualizacao() {
    const agora = new Date();
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('ultimaAtualizacao').textContent = hora;
}

// Calcular tempo online
function calcularTempoOnline(ultimaAtividade) {
    const agora = new Date();
    const atividade = new Date(ultimaAtividade);
    const diferenca = agora - atividade;
    
    const minutos = Math.floor(diferenca / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    
    if (horas > 0) {
        return `${horas}h ${minutos % 60}m`;
    } else {
        return `${minutos}m`;
    }
}

// Formatar data e hora
function formatarDataHora(data) {
    return new Date(data).toLocaleString('pt-BR');
}

// Filtrar usuários online
function filtrarUsuariosOnline() {
    const busca = document.getElementById('searchOnline').value.toLowerCase();
    const tipoJanela = document.getElementById('filterTipoJanelaOnline').value;
    
    usuariosOnlineFiltrados = usuariosOnlineData.filter(usuario => {
        const matchBusca = usuario.nick_canal.toLowerCase().includes(busca);
        const matchTipo = !tipoJanela || usuario.tipo_janela === tipoJanela;
        
        return matchBusca && matchTipo;
    });
    
    renderizarTabelaUsuariosOnline();
}

// Ordenar usuários online
function ordenarUsuariosOnline() {
    const orderBy = document.getElementById('orderByOnline').value;
    
    usuariosOnlineFiltrados.sort((a, b) => {
        switch(orderBy) {
            case 'nick_canal':
                return a.nick_canal.localeCompare(b.nick_canal);
            case 'pontos':
                return b.pontos - a.pontos;
            case 'tempo_online':
                return new Date(a.ultima_atividade) - new Date(b.ultima_atividade);
            default:
                return 0;
        }
    });
    
    renderizarTabelaUsuariosOnline();
}

// Atualizar usuários online manualmente
async function atualizarUsuariosOnline() {
    mostrarLoading(true);
    await carregarUsuariosOnline();
    mostrarLoading(false);
    mostrarNotificacao('Lista de usuários online atualizada!', 'success');
}

// Toggle auto-update
function toggleAutoUpdate() {
    if (autoUpdateAtivo) {
        // Desativar auto-update
        clearInterval(autoUpdateInterval);
        autoUpdateAtivo = false;
        document.getElementById('autoUpdateText').textContent = 'Ativar Auto-Update';
        document.getElementById('autoUpdateStatus').style.display = 'none';
        mostrarNotificacao('Auto-update desativado', 'success');
    } else {
        // Ativar auto-update
        autoUpdateInterval = setInterval(carregarUsuariosOnline, intervaloAutoUpdate * 1000);
        autoUpdateAtivo = true;
        document.getElementById('autoUpdateText').textContent = 'Desativar Auto-Update';
        document.getElementById('autoUpdateStatus').style.display = 'block';
        document.getElementById('intervalText').textContent = intervaloAutoUpdate;
        mostrarNotificacao(`Auto-update ativado (${intervaloAutoUpdate}s)`, 'success');
    }
}

// Alterar intervalo de auto-update
function alterarIntervalo() {
    const novoIntervalo = prompt('Digite o novo intervalo em segundos (mínimo 10):', intervaloAutoUpdate);
    
    if (novoIntervalo === null || novoIntervalo === '') {
        return;
    }
    
    const intervalo = parseInt(novoIntervalo);
    if (isNaN(intervalo) || intervalo < 10) {
        mostrarNotificacao('Intervalo deve ser um número maior que 10 segundos', 'error');
        return;
    }
    
    intervaloAutoUpdate = intervalo;
    document.getElementById('intervalText').textContent = intervaloAutoUpdate;
    
    // Reiniciar auto-update se estiver ativo
    if (autoUpdateAtivo) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = setInterval(carregarUsuariosOnline, intervaloAutoUpdate * 1000);
    }
    
    mostrarNotificacao(`Intervalo alterado para ${intervaloAutoUpdate} segundos`, 'success');
}

// Desconectar usuário
async function desconectarUsuario(nickCanal) {
    if (!confirm(`Tem certeza que deseja desconectar o usuário "${nickCanal}"?`)) {
        return;
    }
    
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/weblurk/desconectar-usuario`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nick_canal: nickCanal })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacao(data.message, 'success');
            carregarUsuariosOnline();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao desconectar usuário:', error);
        mostrarNotificacao('Erro ao desconectar usuário', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Ver detalhes do usuário
function verDetalhesUsuario(nickCanal) {
    const usuario = usuariosOnlineData.find(u => u.nick_canal === nickCanal);
    
    if (!usuario) {
        mostrarNotificacao('Usuário não encontrado', 'error');
        return;
    }
    
    const tempoOnline = calcularTempoOnline(usuario.ultima_atividade);
    const detalhes = `
Usuário: ${usuario.nick_canal}
Pontos: ${usuario.pontos}
Tipo de Janela: ${usuario.tipo_janela}
Tempo Online: ${tempoOnline}
Última Atividade: ${formatarDataHora(usuario.ultima_atividade)}
Status: Online
    `;
    
    alert(detalhes);
}

// Exportar usuários online
async function exportarUsuariosOnline() {
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE}/weblurk/exportar-usuarios-online`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'usuarios_online_weblurk.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            mostrarNotificacao('Usuários online exportados com sucesso!', 'success');
        } else {
            const data = await response.json();
            mostrarNotificacao(data.message || 'Erro ao exportar usuários online', 'error');
        }
    } catch (error) {
        console.error('Erro ao exportar usuários online:', error);
        mostrarNotificacao('Erro ao exportar usuários online', 'error');
    } finally {
        mostrarLoading(false);
    }
}

