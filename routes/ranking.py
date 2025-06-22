from flask import Blueprint, request, jsonify, session
from src.models.database import db, Usuario
from sqlalchemy import desc
import pandas as pd
import io
from flask import make_response

ranking_bp = Blueprint('ranking', __name__)

@ranking_bp.route('/obter-ranking', methods=['GET'])
def obter_ranking():
    """Obtém o ranking dos usuários por pontuação"""
    try:
        admin_id = session.get('admin_id')
        if not admin_id:
            return jsonify({'success': False, 'message': 'Acesso negado'}), 401
        
        # Buscar usuários ordenados por pontuação (maior para menor)
        usuarios = Usuario.query.order_by(desc(Usuario.pontos)).all()
        
        ranking_list = []
        for posicao, usuario in enumerate(usuarios, 1):
            # Calcular média baseada em 1000 pontos
            media = (usuario.pontos / 1000) * 100 if usuario.pontos > 0 else 0
            
            ranking_list.append({
                'posicao': posicao,
                'espectador': usuario.nick_canal,
                'pontos': usuario.pontos,
                'media': round(media, 2)
            })
        
        return jsonify({
            'success': True,
            'ranking': ranking_list,
            'total_usuarios': len(ranking_list)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao obter ranking: {str(e)}'}), 500

@ranking_bp.route('/exportar-xlsx', methods=['GET'])
def exportar_xlsx():
    """Exporta o ranking para arquivo Excel (.xlsx)"""
    try:
        admin_id = session.get('admin_id')
        if not admin_id:
            return jsonify({'success': False, 'message': 'Acesso negado'}), 401
        
        # Buscar dados do ranking
        usuarios = Usuario.query.order_by(desc(Usuario.pontos)).all()
        
        dados_ranking = []
        for posicao, usuario in enumerate(usuarios, 1):
            media = (usuario.pontos / 1000) * 100 if usuario.pontos > 0 else 0
            dados_ranking.append({
                'Posição': posicao,
                'Espectadores': usuario.nick_canal,
                'Pontos': usuario.pontos,
                'Média': round(media, 2)
            })
        
        # Criar DataFrame
        df = pd.DataFrame(dados_ranking)
        
        # Criar arquivo Excel em memória
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Ranking', index=False)
        
        output.seek(0)
        
        # Criar resposta
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response.headers['Content-Disposition'] = 'attachment; filename=ranking_weblurk.xlsx'
        
        return response
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao exportar Excel: {str(e)}'}), 500

@ranking_bp.route('/exportar-csv', methods=['GET'])
def exportar_csv():
    """Exporta o ranking para arquivo CSV"""
    try:
        admin_id = session.get('admin_id')
        if not admin_id:
            return jsonify({'success': False, 'message': 'Acesso negado'}), 401
        
        # Buscar dados do ranking
        usuarios = Usuario.query.order_by(desc(Usuario.pontos)).all()
        
        dados_ranking = []
        for posicao, usuario in enumerate(usuarios, 1):
            media = (usuario.pontos / 1000) * 100 if usuario.pontos > 0 else 0
            dados_ranking.append({
                'Posição': posicao,
                'Espectadores': usuario.nick_canal,
                'Pontos': usuario.pontos,
                'Média': round(media, 2)
            })
        
        # Criar DataFrame
        df = pd.DataFrame(dados_ranking)
        
        # Criar arquivo CSV em memória
        output = io.StringIO()
        df.to_csv(output, index=False, encoding='utf-8')
        
        # Criar resposta
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = 'attachment; filename=ranking_weblurk.csv'
        
        return response
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao exportar CSV: {str(e)}'}), 500

@ranking_bp.route('/limpar-ranking', methods=['DELETE'])
def limpar_ranking():
    """Limpa todos os dados do ranking"""
    try:
        admin_id = session.get('admin_id')
        if not admin_id:
            return jsonify({'success': False, 'message': 'Acesso negado'}), 401
        
        # Resetar pontos de todos os usuários
        usuarios = Usuario.query.all()
        for usuario in usuarios:
            usuario.pontos = 0
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Ranking limpo com sucesso!'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao limpar ranking: {str(e)}'}), 500

