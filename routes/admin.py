from flask import Blueprint, request, jsonify, session
from src.models.database import db, Administrador
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/login', methods=['POST'])
def login():
    """Login do administrador"""
    try:
        data = request.get_json()
        login = data.get('login', '').strip()
        senha = data.get('senha', '').strip()
        
        if not login or not senha:
            return jsonify({'success': False, 'message': 'Login e senha são obrigatórios'}), 400
        
        admin = Administrador.query.filter_by(login=login, senha=senha).first()
        
        if not admin:
            return jsonify({'success': False, 'message': 'Login ou senha incorretos'}), 401
        
        # Salvar na sessão
        session['admin_id'] = admin.id
        session['admin_login'] = admin.login
        session['admin_criador'] = admin.criador
        
        return jsonify({
            'success': True,
            'message': 'Login realizado com sucesso!',
            'admin': admin.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro no login: {str(e)}'}), 500

@admin_bp.route('/logout', methods=['POST'])
def logout():
    """Logout do administrador"""
    try:
        session.pop('admin_id', None)
        session.pop('admin_login', None)
        session.pop('admin_criador', None)
        
        return jsonify({'success': True, 'message': 'Logout realizado com sucesso!'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro no logout: {str(e)}'}), 500

@admin_bp.route('/verificar-sessao', methods=['GET'])
def verificar_sessao():
    """Verifica se o administrador está logado"""
    try:
        admin_id = session.get('admin_id')
        
        if not admin_id:
            return jsonify({'logado': False})
        
        admin = Administrador.query.get(admin_id)
        if not admin:
            return jsonify({'logado': False})
        
        return jsonify({
            'logado': True,
            'admin': admin.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao verificar sessão: {str(e)}'}), 500

@admin_bp.route('/criar-admin', methods=['POST'])
def criar_admin():
    """Cria um novo administrador"""
    try:
        admin_id = session.get('admin_id')
        if not admin_id:
            return jsonify({'success': False, 'message': 'Acesso negado'}), 401
        
        data = request.get_json()
        login = data.get('login', '').strip()
        senha = data.get('senha', '').strip()
        
        if not login or not senha:
            return jsonify({'success': False, 'message': 'Login e senha são obrigatórios'}), 400
        
        # Verificar se login já existe
        admin_existente = Administrador.query.filter_by(login=login).first()
        if admin_existente:
            return jsonify({'success': False, 'message': 'Login já existe'}), 400
        
        # Criar novo administrador
        novo_admin = Administrador(login=login, senha=senha, criador=False)
        db.session.add(novo_admin)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Administrador criado com sucesso!',
            'admin': novo_admin.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao criar administrador: {str(e)}'}), 500

@admin_bp.route('/listar-admins', methods=['GET'])
def listar_admins():
    """Lista todos os administradores"""
    try:
        admin_id = session.get('admin_id')
        if not admin_id:
            return jsonify({'success': False, 'message': 'Acesso negado'}), 401
        
        admins = Administrador.query.all()
        admins_list = [admin.to_dict() for admin in admins]
        
        return jsonify({
            'success': True,
            'admins': admins_list
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao listar administradores: {str(e)}'}), 500

@admin_bp.route('/excluir-admin/<int:admin_id_excluir>', methods=['DELETE'])
def excluir_admin(admin_id_excluir):
    """Exclui um administrador"""
    try:
        admin_id = session.get('admin_id')
        admin_criador = session.get('admin_criador')
        
        if not admin_id:
            return jsonify({'success': False, 'message': 'Acesso negado'}), 401
        
        admin_atual = Administrador.query.get(admin_id)
        admin_para_excluir = Administrador.query.get(admin_id_excluir)
        
        if not admin_para_excluir:
            return jsonify({'success': False, 'message': 'Administrador não encontrado'}), 404
        
        # Verificar se é o administrador criador tentando se excluir
        if admin_para_excluir.criador:
            return jsonify({'success': False, 'message': 'Não é possível excluir o administrador criador'}), 403
        
        # Verificar permissões
        if not admin_criador and admin_id != admin_id_excluir:
            return jsonify({'success': False, 'message': 'Sem permissão para excluir este administrador'}), 403
        
        db.session.delete(admin_para_excluir)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Administrador excluído com sucesso!'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao excluir administrador: {str(e)}'}), 500

@admin_bp.route('/alterar-senha', methods=['PUT'])
def alterar_senha():
    """Altera a senha do administrador"""
    try:
        admin_id = session.get('admin_id')
        if not admin_id:
            return jsonify({'success': False, 'message': 'Acesso negado'}), 401
        
        data = request.get_json()
        nova_senha = data.get('nova_senha', '').strip()
        
        if not nova_senha:
            return jsonify({'success': False, 'message': 'Nova senha é obrigatória'}), 400
        
        admin = Administrador.query.get(admin_id)
        if not admin:
            return jsonify({'success': False, 'message': 'Administrador não encontrado'}), 404
        
        admin.senha = nova_senha
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Senha alterada com sucesso!'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao alterar senha: {str(e)}'}), 500

