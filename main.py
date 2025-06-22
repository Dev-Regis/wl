import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.database import db
from src.routes.weblurk import weblurk_bp
from src.routes.admin import admin_bp
from src.routes.ranking import ranking_bp
from src.routes.agenda import agenda_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'weblurk_secret_key_2025'
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')

# Habilitar CORS para todas as rotas
CORS(app)

# Registrar blueprints
app.register_blueprint(weblurk_bp, url_prefix='/api')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(ranking_bp, url_prefix='/api/ranking')
app.register_blueprint(agenda_bp, url_prefix='/api/agenda')

# Configuração do banco de dados
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Criar pasta de uploads se não existir
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

with app.app_context():
    db.create_all()
    # Criar administrador padrão
    from src.models.database import Administrador
    admin_default = Administrador.query.filter_by(login='ADM').first()
    if not admin_default:
        admin_default = Administrador(login='ADM', senha='123', criador=True)
        db.session.add(admin_default)
        db.session.commit()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if__name__=='__main__':
 port=int(os.environ.get('PORT',5001))
 app.run(host='0.0.0.0',port=port,debug=False)
