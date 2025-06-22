from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    
    id = db.Column(db.Integer, primary_key=True)
    nick_canal = db.Column(db.String(100), nullable=False)
    pontos = db.Column(db.Integer, default=0)
    online = db.Column(db.Boolean, default=False)
    tipo_janela = db.Column(db.String(10), default='popup')  # 'popup' ou 'tab'
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    ultima_atividade = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamento com sessões de lurk
    sessoes = db.relationship('SessaoLurk', backref='usuario', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'nick_canal': self.nick_canal,
            'pontos': self.pontos,
            'online': self.online,
            'tipo_janela': self.tipo_janela,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'ultima_atividade': self.ultima_atividade.isoformat() if self.ultima_atividade else None
        }

class Administrador(db.Model):
    __tablename__ = 'administradores'
    
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String(50), unique=True, nullable=False)
    senha = db.Column(db.String(100), nullable=False)
    criador = db.Column(db.Boolean, default=False)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'login': self.login,
            'criador': self.criador,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }

class Agenda(db.Model):
    __tablename__ = 'agenda'
    
    id = db.Column(db.Integer, primary_key=True)
    hora = db.Column(db.Time, nullable=False)
    data = db.Column(db.Date, nullable=False)
    link_plataforma = db.Column(db.String(200), nullable=False)
    nome_canal = db.Column(db.String(100), nullable=False)
    data_importacao = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'hora': self.hora.strftime('%H:%M') if self.hora else None,
            'data': self.data.strftime('%Y-%m-%d') if self.data else None,
            'link_plataforma': self.link_plataforma,
            'nome_canal': self.nome_canal,
            'data_importacao': self.data_importacao.isoformat() if self.data_importacao else None
        }

class SessaoLurk(db.Model):
    __tablename__ = 'sessoes_lurk'
    
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    tipo_janela = db.Column(db.String(10), nullable=False)  # 'popup' ou 'tab'
    ativa = db.Column(db.Boolean, default=True)
    inicio_sessao = db.Column(db.DateTime, default=datetime.utcnow)
    fim_sessao = db.Column(db.DateTime, nullable=True)
    pontos_gerados = db.Column(db.Integer, default=0)
    
    def to_dict(self):
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'tipo_janela': self.tipo_janela,
            'ativa': self.ativa,
            'inicio_sessao': self.inicio_sessao.isoformat() if self.inicio_sessao else None,
            'fim_sessao': self.fim_sessao.isoformat() if self.fim_sessao else None,
            'pontos_gerados': self.pontos_gerados
        }

