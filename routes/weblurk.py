from flask import Blueprint, request, jsonify, session
from src.models.database import db, Usuario, SessaoLurk, Agenda
from datetime import datetime, timedelta
import threading
import time

weblurk_bp = Blueprint('weblurk', __name__)

# Dicionário para controlar threads de pontuação
pontuacao_threads = {}

def gerar_pontos_usuario(usuario_id):
    """Thread para gerar pontos a cada 6 minutos"""
    while usuario_id in pontuacao_threads and pontuacao_threads[usuario_id]:
        time.sleep(360)  # 6 minutos = 360 segundos
        
        if usuario_id in pontuacao_threads and pontuacao_threads[usuario_id]:
            usuario = Usuario.query.get(usuario_id)
            if usuario and usuario.online:
                usuario.pontos += 1
                usuario.ultima_atividade = datetime.utcnow()
                
                # Atualizar sessão ativa
                sessao_ativa = SessaoLurk.query.filter_by(
                    usuario_id=usuario_id, 
                    ativa=True
                ).first()
                if sessao_ativa:
                    sessao_ativa.pontos_gerados += 1
                
                db.session.commit()

@weblurk_bp.route('/salvar-nick', methods=['POST'])
def salvar_nick():
    """Salva o nick do canal no banco de dados"""
    try:
        data = request.get_json()
        nick_canal = data.get('nick_canal', '').strip()
        
        if not nick_canal:
            return jsonify({'success': False, 'message': 'Nick do canal é obrigatório'}), 400
        
        # Verificar se usuário já existe
        usuario = Usuario.query.filter_by(nick_canal=nick_canal).first()
        
        if not usuario:
            # Criar novo usuário
            usuario = Usuario(nick_canal=nick_canal)
            db.session.add(usuario)
            db.session.commit()
            
        # Salvar na sessão
        session['usuario_id'] = usuario.id
        session['nick_canal'] = nick_canal
        
        return jsonify({
            'success': True, 
            'message': 'Nick salvo com sucesso!',
            'usuario': usuario.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao salvar nick: {str(e)}'}), 500

@weblurk_bp.route('/iniciar-lurk', methods=['POST'])
def iniciar_lurk():
    """Inicia o sistema de lurk"""
    try:
        data = request.get_json()
        tipo_janela = data.get('tipo_janela', 'popup')
        usuario_id = session.get('usuario_id')
        
        if not usuario_id:
            return jsonify({'success': False, 'message': 'Usuário não encontrado na sessão'}), 400
        
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'success': False, 'message': 'Usuário não encontrado'}), 404
        
        # Finalizar sessão anterior se existir
        sessao_anterior = SessaoLurk.query.filter_by(
            usuario_id=usuario_id, 
            ativa=True
        ).first()
        
        if sessao_anterior:
            sessao_anterior.ativa = False
            sessao_anterior.fim_sessao = datetime.utcnow()
        
        # Parar thread anterior se existir
        if usuario_id in pontuacao_threads:
            pontuacao_threads[usuario_id] = False
        
        # Criar nova sessão
        nova_sessao = SessaoLurk(
            usuario_id=usuario_id,
            tipo_janela=tipo_janela,
            ativa=True
        )
        db.session.add(nova_sessao)
        
        # Atualizar usuário
        usuario.online = True
        usuario.tipo_janela = tipo_janela
        usuario.ultima_atividade = datetime.utcnow()
        
        db.session.commit()
        
        # Iniciar thread de pontuação
        pontuacao_threads[usuario_id] = True
        thread = threading.Thread(target=gerar_pontos_usuario, args=(usuario_id,))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Lurk iniciado com sucesso!',
            'tipo_janela': tipo_janela,
            'sessao': nova_sessao.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao iniciar lurk: {str(e)}'}), 500

@weblurk_bp.route('/finalizar-lurk', methods=['POST'])
def finalizar_lurk():
    """Finaliza o sistema de lurk"""
    try:
        usuario_id = session.get('usuario_id')
        
        if not usuario_id:
            return jsonify({'success': False, 'message': 'Usuário não encontrado na sessão'}), 400
        
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'success': False, 'message': 'Usuário não encontrado'}), 404
        
        # Finalizar sessão ativa
        sessao_ativa = SessaoLurk.query.filter_by(
            usuario_id=usuario_id, 
            ativa=True
        ).first()
        
        if sessao_ativa:
            sessao_ativa.ativa = False
            sessao_ativa.fim_sessao = datetime.utcnow()
        
        # Parar thread de pontuação
        if usuario_id in pontuacao_threads:
            pontuacao_threads[usuario_id] = False
            del pontuacao_threads[usuario_id]
        
        # Atualizar usuário
        usuario.online = False
        usuario.ultima_atividade = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Lurk finalizado com sucesso!'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao finalizar lurk: {str(e)}'}), 500

@weblurk_bp.route('/status-lurk', methods=['GET'])
def status_lurk():
    """Retorna o status atual do lurk do usuário"""
    try:
        usuario_id = session.get('usuario_id')
        
        if not usuario_id:
            return jsonify({'lurk_ativo': False, 'usuario': None})
        
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'lurk_ativo': False, 'usuario': None})
        
        sessao_ativa = SessaoLurk.query.filter_by(
            usuario_id=usuario_id, 
            ativa=True
        ).first()
        
        return jsonify({
            'lurk_ativo': usuario.online and sessao_ativa is not None,
            'usuario': usuario.to_dict(),
            'sessao': sessao_ativa.to_dict() if sessao_ativa else None
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao verificar status: {str(e)}'}), 500

@weblurk_bp.route('/agenda-atual', methods=['GET'])
def agenda_atual():
    """Retorna a agenda do dia atual"""
    try:
        data_hoje = datetime.now().date()
        
        agenda_hoje = Agenda.query.filter_by(data=data_hoje).order_by(Agenda.hora).all()
        
        agenda_list = [item.to_dict() for item in agenda_hoje]
        
        return jsonify({
            'success': True,
            'data': data_hoje.strftime('%Y-%m-%d'),
            'agenda': agenda_list
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao buscar agenda: {str(e)}'}), 500

@weblurk_bp.route('/usuarios-online', methods=['GET'])
def usuarios_online():
    """Retorna lista de usuários online"""
    try:
        usuarios = Usuario.query.filter_by(online=True).all()
        usuarios_list = [usuario.to_dict() for usuario in usuarios]
        
        return jsonify({
            'success': True,
            'usuarios_online': usuarios_list,
            'total': len(usuarios_list)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao buscar usuários online: {str(e)}'}), 500

