from flask import Blueprint, request, jsonify, session, current_app
from src.models.database import db, Agenda
from datetime import datetime, date
import pandas as pd
import os
from werkzeug.utils import secure_filename

agenda_bp = Blueprint('agenda', __name__)

ALLOWED_EXTENSIONS = {'xlsx', 'csv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@agenda_bp.route('/upload', methods=['POST'])
def upload_agenda():
    """Upload e processamento da agenda Excel/CSV"""
    try:
        admin_id = session.get('admin_id')
        if not admin_id:
            return jsonify({'success': False, 'message': 'Acesso negado'}), 401
        
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'Nenhum arquivo enviado'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'Nenhum arquivo selecionado'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'message': 'Formato de arquivo não suportado. Use .xlsx ou .csv'}), 400
        
        # Salvar arquivo temporariamente
        filename = secure_filename(file.filename)
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Ler arquivo baseado na extensão
            if filename.lower().endswith('.xlsx'):
                df = pd.read_excel(filepath)
            else:  # CSV
                df = pd.read_csv(filepath)
            
            # Verificar se o arquivo tem as colunas necessárias
            if len(df.columns) < 4:
                return jsonify({'success': False, 'message': 'Arquivo deve ter pelo menos 4 colunas (Hora, Data, Link, Canal)'}), 400
            
            # Renomear colunas para padronização
            df.columns = ['hora', 'data', 'link_plataforma', 'nome_canal']
            
            # Limpar agenda existente
            Agenda.query.delete()
            
            # Processar cada linha
            registros_inseridos = 0
            for index, row in df.iterrows():
                try:
                    # Processar hora
                    if pd.isna(row['hora']):
                        continue
                    
                    hora_str = str(row['hora']).strip()
                    if ':' in hora_str:
                        hora_obj = datetime.strptime(hora_str, '%H:%M').time()
                    else:
                        # Tentar formato de hora sem dois pontos
                        if len(hora_str) <= 2:
                            hora_obj = datetime.strptime(f"{hora_str}:00", '%H:%M').time()
                        else:
                            continue
                    
                    # Processar data
                    if pd.isna(row['data']):
                        continue
                    
                    data_str = str(row['data']).strip()
                    try:
                        # Tentar diferentes formatos de data
                        if '-' in data_str:
                            data_obj = datetime.strptime(data_str, '%d-%m-%Y').date()
                        elif '/' in data_str:
                            data_obj = datetime.strptime(data_str, '%d/%m/%Y').date()
                        else:
                            continue
                    except:
                        continue
                    
                    # Processar link e canal
                    link_plataforma = str(row['link_plataforma']).strip() if not pd.isna(row['link_plataforma']) else ''
                    nome_canal = str(row['nome_canal']).strip() if not pd.isna(row['nome_canal']) else ''
                    
                    if not link_plataforma or not nome_canal:
                        continue
                    
                    # Criar registro na agenda
                    agenda_item = Agenda(
                        hora=hora_obj,
                        data=data_obj,
                        link_plataforma=link_plataforma,
                        nome_canal=nome_canal
                    )
                    
                    db.session.add(agenda_item)
                    registros_inseridos += 1
                    
                except Exception as e:
                    print(f"Erro ao processar linha {index}: {e}")
                    continue
            
            db.session.commit()
            
            # Remover arquivo temporário
            os.remove(filepath)
            
            return jsonify({
                'success': True,
                'message': f'Agenda importada com sucesso! {registros_inseridos} registros inseridos.',
                'registros_inseridos': registros_inseridos
            })
            
        except Exception as e:
            # Remover arquivo temporário em caso de erro
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'success': False, 'message': f'Erro ao processar arquivo: {str(e)}'}), 500
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro no upload: {str(e)}'}), 500

@agenda_bp.route('/exportar-excel', methods=['GET'])
def exportar_excel():
    """Exporta a agenda atual para Excel"""
    try:
        admin_id = session.get('admin_id')
        if not admin_id:
            return jsonify({'success': False, 'message': 'Acesso negado'}), 401
        
        # Buscar todos os itens da agenda
        agenda_items = Agenda.query.order_by(Agenda.data, Agenda.hora).all()
        
        dados_agenda = []
        for item in agenda_items:
            dados_agenda.append({
                'Hora': item.hora.strftime('%H:%M'),
                'Data': item.data.strftime('%d-%m-%Y'),
                'Link Plataforma': item.link_plataforma,
                'Nome Canal': item.nome_canal
            })
        
        # Criar DataFrame
        df = pd.DataFrame(dados_agenda)
        
        # Criar arquivo Excel em memória
        from io import BytesIO
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Agenda', index=False)
        
        output.seek(0)
        
        # Criar resposta
        from flask import make_response
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response.headers['Content-Disposition'] = 'attachment; filename=agenda_weblurk.xlsx'
        
        return response
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao exportar Excel: {str(e)}'}), 500

@agenda_bp.route('/limpar-agenda', methods=['DELETE'])
def limpar_agenda():
    """Limpa toda a agenda"""
    try:
        admin_id = session.get('admin_id')
        if not admin_id:
            return jsonify({'success': False, 'message': 'Acesso negado'}), 401
        
        # Deletar todos os registros da agenda
        Agenda.query.delete()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Agenda limpa com sucesso!'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao limpar agenda: {str(e)}'}), 500

@agenda_bp.route('/obter-agenda', methods=['GET'])
def obter_agenda():
    """Obtém a agenda completa ou de uma data específica"""
    try:
        admin_id = session.get('admin_id')
        if not admin_id:
            return jsonify({'success': False, 'message': 'Acesso negado'}), 401
        
        data_param = request.args.get('data')
        
        if data_param:
            # Buscar agenda de uma data específica
            try:
                data_obj = datetime.strptime(data_param, '%Y-%m-%d').date()
                agenda_items = Agenda.query.filter_by(data=data_obj).order_by(Agenda.hora).all()
            except:
                return jsonify({'success': False, 'message': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
        else:
            # Buscar toda a agenda
            agenda_items = Agenda.query.order_by(Agenda.data, Agenda.hora).all()
        
        agenda_list = [item.to_dict() for item in agenda_items]
        
        return jsonify({
            'success': True,
            'agenda': agenda_list,
            'total_items': len(agenda_list)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao obter agenda: {str(e)}'}), 500

