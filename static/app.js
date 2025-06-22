// WebLurk - Sistema de Lurk para Twitch
// Configurações globais
const API_BASE = '/api';
let lurkAtivo = false;
let usuarioAtual = null;
let agendaAtual = [];
let lurkWindow = null;
let atualizacaoInterval = null;
let reaberturaPendente = false;

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    inicializarApp();
    verificarStatusLurk();
    carregarAgenda();
    configurarEventListeners();
    
    // Atualizar agenda a cada 1 hora
    setInterval(carregarAgenda, 3600000); // 1 hora
    
    // Verificar status a cada 30 segundos
    setInterval(verificarStatusLurk, 30000);
});

// Configurar event listeners
function configurarEventListeners() {
    // Botão Salvar Nick
    document.getElementById('saveBtn').addEventListener('click', salvarNick);
    
    // Enter no campo de nick
    document.getElementById('nickInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            salvarNick();
        }
    });
    
    // Botão Lurk
    document.getElementById('lurkBtn').addEventListener('click', toggleLurk);
    
    // Mudança no tipo de janela
    document.getElementById('windowType').addEventListener('change', function() {
        if (lurkAtivo) {
            // Se lurk está ativo, aplicar mudança imediatamente
            const novoTipo = this.value;
            alterarTipoJanela(novoTipo);
        }
    });
    
    // Detectar fechamento de janela
    window.addEventListener('beforeunload', function() {
        if (lurkWindow && !lurkWindow.closed) {
            lurkWindow.close();
        }
    });
}

// Inicializar aplicação
function inicializarApp() {
    // Definir data atual
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    document.getElementById('currentDate').innerHTML = `
        <i class="fas fa-clock me-1"></i>
        ${dataFormatada}
    `;
}

// Salvar nick do canal
async function salvarNick() {
    const nickInput = document.getElementById('nickInput');
    const nick = nickInput.value.trim();
    
    if (!nick) {
        mostrarNotificacao('Por favor, digite o nick do canal', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/salvar-nick`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nick_canal: nick })
        });
        
        const data = await response.json();
        
        if (data.success) {
            usuarioAtual = data.usuario;
            mostrarNotificacao(data.message, 'success');
            
            // Habilitar botão de lurk
            document.getElementById('lurkBtn').disabled = false;
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar nick:', error);
        mostrarNotificacao('Erro ao salvar nick do canal', 'error');
    }
}

// Toggle Lurk (Iniciar/Finalizar)
async function toggleLurk() {
    if (!usuarioAtual) {
        mostrarNotificacao('Primeiro salve o nick do canal', 'error');
        return;
    }
    
    if (lurkAtivo) {
        await finalizarLurk();
    } else {
        await iniciarLurk();
    }
}

// Iniciar Lurk
async function iniciarLurk() {
    const tipoJanela = document.getElementById('windowType').value;
    
    try {
        const response = await fetch(`${API_BASE}/iniciar-lurk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tipo_janela: tipoJanela })
        });
        
        const data = await response.json();
        
        if (data.success) {
            lurkAtivo = true;
            atualizarInterfaceLurk();
            abrirJanelaLurk(tipoJanela);
            mostrarNotificacao(data.message, 'success');
            
            // Iniciar monitoramento da janela
            iniciarMonitoramentoJanela();
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao iniciar lurk:', error);
        mostrarNotificacao('Erro ao iniciar lurk', 'error');
    }
}

// Finalizar Lurk
async function finalizarLurk() {
    try {
        const response = await fetch(`${API_BASE}/finalizar-lurk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            lurkAtivo = false;
            atualizarInterfaceLurk();
            fecharJanelaLurk();
            mostrarNotificacao(data.message, 'success');
            
            // Parar monitoramento
            if (atualizacaoInterval) {
                clearInterval(atualizacaoInterval);
                atualizacaoInterval = null;
            }
        } else {
            mostrarNotificacao(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao finalizar lurk:', error);
        mostrarNotificacao('Erro ao finalizar lurk', 'error');
    }
}

// Abrir janela de lurk
function abrirJanelaLurk(tipo) {
    const urlAtual = obterUrlAtual();
    
    if (tipo === 'popup') {
        // Fechar tab se existir
        if (lurkWindow && !lurkWindow.closed) {
            lurkWindow.close();
        }
        
        // Abrir popup
        lurkWindow = window.open(
            urlAtual,
            'WebLurkPopup',
            'width=800,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no'
        );
    } else {
        // Fechar popup se existir
        if (lurkWindow && !lurkWindow.closed) {
            lurkWindow.close();
        }
        
        // Abrir nova aba
        lurkWindow = window.open(urlAtual, '_blank');
    }
}

// Fechar janela de lurk
function fecharJanelaLurk() {
    if (lurkWindow && !lurkWindow.closed) {
        lurkWindow.close();
    }
    lurkWindow = null;
}

// Alterar tipo de janela
function alterarTipoJanela(novoTipo) {
    if (lurkAtivo) {
        fecharJanelaLurk();
        setTimeout(() => {
            abrirJanelaLurk(novoTipo);
        }, 500);
    }
}

// Obter URL atual da agenda
function obterUrlAtual() {
    const agendaAtiva = obterCanalAtivo();
    
    if (agendaAtiva && agendaAtiva.link_plataforma) {
        return `${agendaAtiva.link_plataforma}${agendaAtiva.nome_canal}`;
    }
    
    // URL padrão se não houver agenda
    return 'https://www.twitch.tv/';
}

// Obter canal ativo no horário atual
function obterCanalAtivo() {
    const agora = new Date();
    const horaAtual = agora.getHours();
    
    return agendaAtual.find(item => {
        const horaItem = parseInt(item.hora.split(':')[0]);
        return horaItem === horaAtual;
    });
}

// Iniciar monitoramento da janela
function iniciarMonitoramentoJanela() {
    // Verificar se janela foi fechada e reabrir após 5 segundos
    atualizacaoInterval = setInterval(() => {
        if (lurkAtivo && lurkWindow && lurkWindow.closed && !reaberturaPendente) {
            reaberturaPendente = true;
            setTimeout(() => {
                if (lurkAtivo) {
                    const tipoJanela = document.getElementById('windowType').value;
                    abrirJanelaLurk(tipoJanela);
                }
                reaberturaPendente = false;
            }, 5000);
        }
        
        // Atualizar URL a cada 13 minutos
        if (lurkAtivo && lurkWindow && !lurkWindow.closed) {
            const urlAtual = obterUrlAtual();
            try {
                lurkWindow.location.href = urlAtual;
            } catch (e) {
                // Ignorar erros de cross-origin
            }
        }
    }, 13 * 60 * 1000); // 13 minutos
    
    // Verificar mudança de hora para atualizar canal
    setInterval(() => {
        if (lurkAtivo && lurkWindow && !lurkWindow.closed) {
            const urlAtual = obterUrlAtual();
            try {
                if (lurkWindow.location.href !== urlAtual) {
                    lurkWindow.location.href = urlAtual;
                }
            } catch (e) {
                // Ignorar erros de cross-origin
            }
        }
    }, 60000); // 1 minuto
}

// Atualizar interface do lurk
function atualizarInterfaceLurk() {
    const lurkBtn = document.getElementById('lurkBtn');
    const statusText = document.getElementById('statusText');
    
    if (lurkAtivo) {
        lurkBtn.innerHTML = '<i class="fas fa-stop me-1"></i>Finalizar Lurk';
        lurkBtn.classList.add('active');
        statusText.textContent = 'Lurk ativo - Gerando pontos...';
    } else {
        lurkBtn.innerHTML = '<i class="fas fa-play me-1"></i>Iniciar Lurk';
        lurkBtn.classList.remove('active');
        statusText.textContent = 'Inicie o lurk para acompanhar a agenda';
    }
}

// Verificar status do lurk
async function verificarStatusLurk() {
    try {
        const response = await fetch(`${API_BASE}/status-lurk`);
        const data = await response.json();
        
        if (data.lurk_ativo !== lurkAtivo) {
            lurkAtivo = data.lurk_ativo;
            atualizarInterfaceLurk();
        }
        
        if (data.usuario) {
            usuarioAtual = data.usuario;
            document.getElementById('nickInput').value = data.usuario.nick_canal;
            document.getElementById('windowType').value = data.usuario.tipo_janela || 'popup';
        }
    } catch (error) {
        console.error('Erro ao verificar status:', error);
    }
}

// Carregar agenda do dia
async function carregarAgenda() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const agendaGrid = document.getElementById('agendaGrid');
    
    loadingSpinner.style.display = 'block';
    agendaGrid.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE}/agenda-atual`);
        const data = await response.json();
        
        if (data.success) {
            agendaAtual = data.agenda;
            renderizarAgenda();
        } else {
            mostrarNotificacao('Erro ao carregar agenda', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar agenda:', error);
        mostrarNotificacao('Erro ao carregar agenda', 'error');
    } finally {
        loadingSpinner.style.display = 'none';
        agendaGrid.style.display = 'grid';
    }
}

// Renderizar agenda na interface
function renderizarAgenda() {
    const agendaGrid = document.getElementById('agendaGrid');
    agendaGrid.innerHTML = '';
    
    // Gerar slots de 01:00 até 00:00 (24 horas)
    for (let hora = 1; hora <= 24; hora++) {
        const horaFormatada = hora === 24 ? '00:00' : `${hora.toString().padStart(2, '0')}:00`;
        const horaDisplay = hora === 24 ? 0 : hora;
        
        // Buscar item da agenda para este horário
        const agendaItem = agendaAtual.find(item => {
            const itemHora = parseInt(item.hora.split(':')[0]);
            return itemHora === horaDisplay;
        });
        
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        
        if (agendaItem) {
            // Slot com conteúdo
            slot.classList.add('active');
            slot.innerHTML = `
                <div class="time-display">${horaFormatada}</div>
                <div class="channel-info">${agendaItem.nome_canal}</div>
                <a href="${agendaItem.link_plataforma}${agendaItem.nome_canal}" 
                   target="_blank" class="channel-link">
                    ${agendaItem.link_plataforma}
                </a>
            `;
        } else {
            // Slot vazio
            slot.classList.add('empty');
            slot.innerHTML = `
                <div class="time-display">${horaFormatada}</div>
                <div class="empty-slot">
                    <i class="fas fa-clock-o me-1"></i>
                    Horário vago
                </div>
            `;
        }
        
        agendaGrid.appendChild(slot);
    }
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

// Utilitários
function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
}

function formatarHora(hora) {
    return hora.substring(0, 5); // HH:MM
}

