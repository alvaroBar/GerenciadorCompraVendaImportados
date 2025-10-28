# models.py
from database import db

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    # Correção: Alterado de 'preco' para 'preco_compra'
    preco_compra = db.Column(db.Float, nullable=False)
    # Correção: Campo adicionado
    preco_venda = db.Column(db.Float, nullable=False)
    # Correção: Campo adicionado
    peso = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'preco_compra': self.preco_compra,
            'preco_venda': self.preco_venda,
            'peso': self.peso
        }