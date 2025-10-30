# backend/models.py
from database import db
from datetime import datetime


class ProdutoCatalogo(db.Model):
    # ... (sem mudanças)
    id = db.Column(db.Integer, primary_key=True);
    nome = db.Column(db.String(100), nullable=False, unique=True);
    preco_venda_estimado_brl = db.Column(db.Float, nullable=False);
    itens_estoque = db.relationship('ItemEstoque', backref='produto_catalogo', lazy=True)

    def to_dict(self): return {'id': self.id, 'nome': self.nome,
                               'preco_venda_estimado_brl': self.preco_venda_estimado_brl}


class ItemEstoque(db.Model):
    # ... (sem mudanças)
    id = db.Column(db.Integer, primary_key=True);
    data_cadastro = db.Column(db.DateTime, nullable=False, default=datetime.utcnow);
    status = db.Column(db.String(50), nullable=False, default='Em Estoque');
    produto_catalogo_id = db.Column(db.Integer, db.ForeignKey('produto_catalogo.id'), nullable=False);
    preco_compra_usd = db.Column(db.Float, nullable=False);
    peso_kg = db.Column(db.Float, nullable=False);
    iof_percent = db.Column(db.Float, nullable=False);
    taxa_dolar = db.Column(db.Float, nullable=False);
    shipping_method = db.Column(db.String(50), nullable=False, default='Air');
    custo_adicional_brl = db.Column(db.Float, nullable=False, default=0.0);
    custo_produto_brl = db.Column(db.Float, nullable=False);
    custo_iof_brl = db.Column(db.Float, nullable=False);
    custo_frete_brl = db.Column(db.Float, nullable=False);
    custo_total_brl = db.Column(db.Float, nullable=False);
    lucro_estimado_brl = db.Column(db.Float, nullable=False);
    lucro_estimado_percent = db.Column(db.Float, nullable=False)

    def to_dict(self):
        produto_info = self.produto_catalogo
        return {'id': self.id, 'status': self.status, 'data_cadastro': self.data_cadastro.isoformat(),
                'produto_catalogo_id': produto_info.id, 'nome_produto': produto_info.nome,
                'preco_venda_estimado_brl': produto_info.preco_venda_estimado_brl,
                'preco_compra_usd': self.preco_compra_usd, 'peso_kg': self.peso_kg, 'iof_percent': self.iof_percent,
                'taxa_dolar': self.taxa_dolar, 'shipping_method': self.shipping_method,
                'custo_produto_brl': self.custo_produto_brl, 'custo_iof_brl': self.custo_iof_brl,
                'custo_frete_brl': self.custo_frete_brl, 'custo_adicional_brl': self.custo_adicional_brl,
                'custo_total_brl': self.custo_total_brl, 'lucro_estimado_brl': self.lucro_estimado_brl,
                'lucro_estimado_percent': self.lucro_estimado_percent}


class Venda(db.Model):
    # ... (sem mudanças)
    id = db.Column(db.Integer, primary_key=True);
    data_venda = db.Column(db.DateTime, nullable=False);
    preco_venda_final_brl = db.Column(db.Float, nullable=False);
    lucro_real_brl = db.Column(db.Float, nullable=False);
    item_id = db.Column(db.Integer, db.ForeignKey('item_estoque.id'), nullable=False, unique=True);
    item_vendido = db.relationship('ItemEstoque', backref=db.backref('venda', uselist=False));
    contas_a_receber = db.relationship('ContaAReceber', backref='venda', lazy=True)

    def to_dict(self):
        item_info = self.item_vendido
        return {'id_venda': self.id, 'data_venda': self.data_venda.isoformat(),
                'preco_venda_final_brl': self.preco_venda_final_brl, 'lucro_real_brl': self.lucro_real_brl,
                'item_id': item_info.id, 'nome_produto': item_info.produto_catalogo.nome,
                'custo_total_brl': item_info.custo_total_brl}


class Transacao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    tipo = db.Column(db.String(50), nullable=False)
    descricao = db.Column(db.String(200), nullable=False)
    valor_brl = db.Column(db.Float, nullable=False)
    item_estoque_id = db.Column(db.Integer, db.ForeignKey('item_estoque.id'), nullable=True)
    venda_id = db.Column(db.Integer, db.ForeignKey('venda.id'), nullable=True)

    # --- 1. NOVA COLUNA ---
    is_manual = db.Column(db.Boolean, nullable=False, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'data': self.data.isoformat().split('T')[0],  # Formata como AAAA-MM-DD
            'tipo': self.tipo,
            'descricao': self.descricao,
            'valor_brl': self.valor_brl,
            'is_manual': self.is_manual
        }


class ContaAPagar(db.Model):
    # ... (sem mudanças)
    id = db.Column(db.Integer, primary_key=True);
    descricao = db.Column(db.String(200), nullable=False);
    valor_brl = db.Column(db.Float, nullable=False);
    data_vencimento = db.Column(db.DateTime, nullable=False);
    status = db.Column(db.String(50), nullable=False, default='Pendente');
    transacao_id = db.Column(db.Integer, db.ForeignKey('transacao.id'), nullable=True)

    def to_dict(self):
        return {'id': self.id, 'descricao': self.descricao, 'valor_brl': self.valor_brl,
                'data_vencimento': self.data_vencimento.isoformat().split('T')[0], 'status': self.status,
                'transacao_id': self.transacao_id}


class ContaAReceber(db.Model):
    # ... (sem mudanças)
    id = db.Column(db.Integer, primary_key=True);
    venda_id = db.Column(db.Integer, db.ForeignKey('venda.id'), nullable=False);
    descricao = db.Column(db.String(200), nullable=True);
    valor_parcela_brl = db.Column(db.Float, nullable=False);
    data_vencimento = db.Column(db.DateTime, nullable=False);
    status = db.Column(db.String(50), nullable=False, default='Pendente');
    transacao_id = db.Column(db.Integer, db.ForeignKey('transacao.id'), nullable=True)

    def to_dict(self):
        return {'id': self.id, 'venda_id': self.venda_id, 'nome_produto': self.venda.item_vendido.produto_catalogo.nome,
                'descricao': self.descricao, 'valor_parcela_brl': self.valor_parcela_brl,
                'data_vencimento': self.data_vencimento.isoformat().split('T')[0], 'status': self.status,
                'transacao_id': self.transacao_id}