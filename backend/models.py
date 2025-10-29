# models.py
from database import db
from datetime import datetime


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    preco_compra = db.Column(db.Float, nullable=False)
    preco_venda = db.Column(db.Float, nullable=False)
    peso = db.Column(db.Float, nullable=False)
    iof_percent = db.Column(db.Float, nullable=False)
    taxa_dolar = db.Column(db.Float, nullable=False)
    frete_usd = db.Column(db.Float, nullable=False)
    data_cadastro = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # --- Nova Coluna ---
    # Armazena 'Air' ou 'Sea', com 'Air' (Aéreo) como padrão
    shipping_method = db.Column(db.String(50), nullable=False, default='Air')

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'preco_compra': self.preco_compra,
            'preco_venda': self.preco_venda,
            'peso': self.peso,
            'iof_percent': self.iof_percent,
            'taxa_dolar': self.taxa_dolar,
            'frete_usd': self.frete_usd,
            'data_cadastro': self.data_cadastro.isoformat(),
            'shipping_method': self.shipping_method  # 2. Enviar para o frontend
        }