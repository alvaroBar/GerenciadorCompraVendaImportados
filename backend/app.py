# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import db
from sqlalchemy.sql import func
from datetime import datetime
# 1. Importar ContaAPagar
from models import ProdutoCatalogo, ItemEstoque, Venda, Transacao, ContaAPagar

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///produtos.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

SHIPPING_RATES = {'Air': 22.5, 'Sea': 12.0}


# --- Funções Auxiliares (sem mudanças) ---
def calcular_custos(data):
    # ... (igual)
    preco_compra_usd = float(data['preco_compra_usd'])
    peso_kg = float(data['peso_kg'])
    iof_percent = float(data['iof_percent'])
    taxa_dolar = float(data['taxa_dolar'])
    shipping_method = data.get('shipping_method', 'Air')
    shipping_rate = SHIPPING_RATES.get(shipping_method, SHIPPING_RATES['Air'])
    custo_produto_brl = preco_compra_usd * taxa_dolar
    custo_iof_brl = (preco_compra_usd * (iof_percent / 100)) * taxa_dolar
    custo_frete_brl = (peso_kg * shipping_rate) * taxa_dolar
    custo_total_brl = custo_produto_brl + custo_iof_brl + custo_frete_brl
    return {
        'custo_produto_brl': custo_produto_brl, 'custo_iof_brl': custo_iof_brl,
        'custo_frete_brl': custo_frete_brl, 'custo_total_brl': custo_total_brl,
    }


def calcular_lucro(custo_total_brl, preco_venda_estimado_brl):
    # ... (igual)
    lucro_brl = preco_venda_estimado_brl - custo_total_brl
    lucro_percent = (lucro_brl / custo_total_brl) * 100 if custo_total_brl > 0 else 0
    return {'lucro_estimado_brl': lucro_brl, 'lucro_estimado_percent': lucro_percent}


# --- ROTAS DO CATÁLOGO (sem mudanças) ---
@app.route('/catalogo', methods=['GET'])
def listar_catalogo():
    # ... (igual)
    produtos = ProdutoCatalogo.query.order_by(ProdutoCatalogo.nome).all()
    return jsonify([p.to_dict() for p in produtos])


# --- ROTAS DO ESTOQUE (com mudanças para integridade financeira) ---

@app.route('/estoque', methods=['GET'])
def listar_estoque():
    # ... (igual)
    itens = ItemEstoque.query.filter_by(status='Em Estoque').order_by(ItemEstoque.data_cadastro.desc()).all()
    return jsonify([item.to_dict() for item in itens])


@app.route('/estoque', methods=['POST'])
def adicionar_item_estoque():
    # ... (igual)
    data = request.json
    try:
        nome_produto = data['nome_produto']
        produto = ProdutoCatalogo.query.filter_by(nome=nome_produto).first()
        if not produto:
            if 'preco_venda_estimado_brl' not in data:
                return jsonify({'erro': 'Preço de venda estimado é obrigatório para produtos novos.'}), 400
            produto = ProdutoCatalogo(nome=nome_produto,
                                      preco_venda_estimado_brl=float(data['preco_venda_estimado_brl']))
            db.session.add(produto)
            db.session.flush()

        custos = calcular_custos(data)
        lucro = calcular_lucro(custos['custo_total_brl'], produto.preco_venda_estimado_brl)

        novo_item = ItemEstoque(
            produto_catalogo_id=produto.id,
            preco_compra_usd=float(data['preco_compra_usd']),
            peso_kg=float(data['peso_kg']),
            iof_percent=float(data['iof_percent']),
            taxa_dolar=float(data['taxa_dolar']),
            shipping_method=data.get('shipping_method', 'Air'),
            custo_produto_brl=custos['custo_produto_brl'], custo_iof_brl=custos['custo_iof_brl'],
            custo_frete_brl=custos['custo_frete_brl'], custo_total_brl=custos['custo_total_brl'],
            lucro_estimado_brl=lucro['lucro_estimado_brl'], lucro_estimado_percent=lucro['lucro_estimado_percent']
        )
        db.session.add(novo_item)
        db.session.flush()

        transacao_custo = Transacao(
            tipo='Custo',
            descricao=f"Compra de {produto.nome} (ID Item: {novo_item.id})",
            valor_brl=novo_item.custo_total_brl,
            item_estoque_id=novo_item.id
        )
        db.session.add(transacao_custo)

        db.session.commit()
        return jsonify(novo_item.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 400


@app.route('/estoque/<int:id>', methods=['PUT'])
def atualizar_item_estoque(id):
    # Rota atualiza o item E a transação de custo associada
    item = ItemEstoque.query.get_or_404(id)
    data = request.json
    try:
        # Atualiza dados do item
        item.preco_compra_usd = float(data.get('preco_compra_usd', item.preco_compra_usd))
        item.peso_kg = float(data.get('peso_kg', item.peso_kg))
        item.iof_percent = float(data.get('iof_percent', item.iof_percent))
        item.taxa_dolar = float(data.get('taxa_dolar', item.taxa_dolar))
        item.shipping_method = data.get('shipping_method', item.shipping_method)

        # Recalcula custos e lucro
        custos = calcular_custos(item.to_dict())
        lucro = calcular_lucro(custos['custo_total_brl'], item.produto_catalogo.preco_venda_estimado_brl)

        item.custo_produto_brl = custos['custo_produto_brl'];
        item.custo_iof_brl = custos['custo_iof_brl']
        item.custo_frete_brl = custos['custo_frete_brl'];
        item.custo_total_brl = custos['custo_total_brl']
        item.lucro_estimado_brl = lucro['lucro_estimado_brl'];
        item.lucro_estimado_percent = lucro['lucro_estimado_percent']

        # Atualiza a transação de custo original
        transacao = Transacao.query.filter_by(item_estoque_id=item.id, tipo='Custo').first()
        if transacao:
            transacao.valor_brl = item.custo_total_brl
            transacao.data = datetime.utcnow()  # Atualiza data da modificação

        db.session.commit()
        return jsonify(item.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 400


@app.route('/estoque/<int:id>', methods=['DELETE'])
def deletar_item_estoque(id):
    # Deleta o item E a transação de custo associada
    item = ItemEstoque.query.get_or_404(id)
    try:
        # Encontra e deleta a transação de custo
        transacao = Transacao.query.filter_by(item_estoque_id=item.id, tipo='Custo').first()
        if transacao:
            db.session.delete(transacao)

        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Item e transação de custo removidos com sucesso'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500


@app.route('/estoque/<int:id>/vender', methods=['POST'])
def vender_item(id):
    # ... (igual)
    item = ItemEstoque.query.get_or_404(id)
    data = request.json
    if item.status == 'Vendido': return jsonify({'erro': 'Este item já foi vendido.'}), 400
    if 'preco_venda_final_brl' not in data: return jsonify({'erro': 'Preço de venda final é obrigatório.'}), 400
    try:
        preco_venda_final = float(data['preco_venda_final_brl'])
        item.status = 'Vendido'
        lucro_real = preco_venda_final - item.custo_total_brl

        nova_venda = Venda(preco_venda_final_brl=preco_venda_final, lucro_real_brl=lucro_real, item_id=item.id)
        db.session.add(nova_venda)
        db.session.flush()

        transacao_receita = Transacao(
            tipo='Receita',
            descricao=f"Venda de {item.produto_catalogo.nome} (ID Venda: {nova_venda.id})",
            valor_brl=preco_venda_final,
            item_estoque_id=item.id, venda_id=nova_venda.id
        )
        db.session.add(transacao_receita)
        db.session.commit()
        return jsonify(nova_venda.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 400


# --- ROTAS DE VENDAS (sem mudanças) ---
@app.route('/vendas', methods=['GET'])
def listar_vendas():
    # ... (igual)
    vendas = Venda.query.order_by(Venda.data_venda.desc()).all()
    return jsonify([v.to_dict() for v in vendas])


# --- 2. NOVAS ROTAS FINANCEIRAS ---

@app.route('/financeiro/balanco', methods=['GET'])
def get_balanco_financeiro():
    try:
        total_receitas = db.session.query(func.sum(Transacao.valor_brl)).filter(
            Transacao.tipo == 'Receita').scalar() or 0.0
        total_custos = db.session.query(func.sum(Transacao.valor_brl)).filter(Transacao.tipo == 'Custo').scalar() or 0.0
        balanco_total = total_receitas - total_custos

        # (NOVO) Calcula o total de contas pendentes
        total_a_pagar = db.session.query(func.sum(ContaAPagar.valor_brl)).filter(
            ContaAPagar.status == 'Pendente').scalar() or 0.0

        return jsonify({
            'total_receitas_brl': total_receitas,
            'total_custos_brl': total_custos,
            'balanco_total_brl': balanco_total,
            'total_a_pagar_brl': total_a_pagar  # Adiciona ao balanço
        }), 200

    except Exception as e:
        return jsonify({'erro': str(e)}), 500


@app.route('/financeiro/transacao-manual', methods=['POST'])
def adicionar_transacao_manual():
    # Rota para adicionar 'Caixa Inicial' ou custos avulsos
    data = request.json
    try:
        tipo = data['tipo']
        if tipo not in ['Receita', 'Custo']:
            return jsonify({'erro': "Tipo deve ser 'Receita' ou 'Custo'"}), 400

        transacao = Transacao(
            tipo=tipo,
            descricao=data['descricao'],
            valor_brl=float(data['valor_brl'])
        )
        db.session.add(transacao)
        db.session.commit()
        return jsonify(transacao.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 400


# --- 3. NOVAS ROTAS PARA CONTAS A PAGAR ---

@app.route('/contas-a-pagar', methods=['GET'])
def listar_contas_a_pagar():
    # Lista contas pendentes por padrão
    status_filtro = request.args.get('status', 'Pendente')
    contas = ContaAPagar.query.filter_by(status=status_filtro).order_by(ContaAPagar.data_vencimento.asc()).all()
    return jsonify([c.to_dict() for c in contas])


@app.route('/contas-a-pagar', methods=['POST'])
def adicionar_conta_a_pagar():
    data = request.json
    try:
        nova_conta = ContaAPagar(
            descricao=data['descricao'],
            valor_brl=float(data['valor_brl']),
            data_vencimento=datetime.fromisoformat(data['data_vencimento'])
        )
        db.session.add(nova_conta)
        db.session.commit()
        return jsonify(nova_conta.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 400


@app.route('/contas-a-pagar/<int:id>/pagar', methods=['POST'])
def pagar_conta(id):
    conta = ContaAPagar.query.get_or_404(id)
    if conta.status == 'Pago':
        return jsonify({'erro': 'Esta conta já foi paga.'}), 400

    try:
        # 1. Cria a transação de Custo (Baixa no Caixa)
        transacao_pagamento = Transacao(
            tipo='Custo',
            descricao=f"Pagamento de conta: {conta.descricao} (ID Conta: {conta.id})",
            valor_brl=conta.valor_brl
        )
        db.session.add(transacao_pagamento)
        db.session.flush()  # Pega o ID da transação

        # 2. Atualiza o status da conta
        conta.status = 'Pago'
        conta.transacao_id = transacao_pagamento.id  # Linka a transação

        db.session.commit()
        return jsonify(conta.to_dict())

    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 400


# --- 5. NOVA ROTA DE ESTIMATIVA ---
# --- 5. ROTA DE ESTIMATIVA (ATUALIZADA) ---
@app.route('/estimativa/calcular', methods=['POST'])
def calcular_estimativa():
    data = request.json

    try:
        preco_compra_usd = float(data['preco_compra_usd'])
        peso_kg = float(data['peso_kg'])
        iof_percent = float(data['iof_percent'])  # IOF das Config. Globais
        taxa_dolar = float(data['taxa_dolar'])
        shipping_method = data.get('shipping_method', 'Air')

        # --- Cálculo do Frete (usado em ambos os cenários) ---
        taxa_envio = SHIPPING_RATES.get(shipping_method, SHIPPING_RATES['Air'])
        custo_frete_brl_real = (peso_kg * taxa_envio) * taxa_dolar

        # --- Cenário 1: Custo Real Detalhado (Cálculo Padrão) ---
        # (Este cálculo permanece o mesmo)
        custo_produto_brl_real = preco_compra_usd * taxa_dolar
        custo_iof_brl_real = (preco_compra_usd * (iof_percent / 100)) * taxa_dolar
        custo_total_real_brl = custo_produto_brl_real + custo_iof_brl_real + custo_frete_brl_real

        # --- Cenário 2: Nova Estimativa (7% + IOF 3.5% + Frete) ---

        # 1. Preço base em BRL
        preco_base_brl = preco_compra_usd * taxa_dolar

        # 2. Aplicar Taxa 7%
        TAXA_7_PERCENT = 0.07  # 7%
        custo_taxa_7_brl = preco_base_brl * TAXA_7_PERCENT
        valor_com_taxa_7 = preco_base_brl + custo_taxa_7_brl

        # 3. Aplicar IOF 3.5% sobre o *novo total*
        TAXA_IOF_ESTIMADA_PERCENT = 0.035  # 3.5%
        custo_iof_estimado_brl = valor_com_taxa_7 * TAXA_IOF_ESTIMADA_PERCENT
        valor_com_iof = valor_com_taxa_7 + custo_iof_estimado_brl

        # 4. Adicionar Frete (calculado no início)
        custo_total_estimado_brl = valor_com_iof + custo_frete_brl_real

        return jsonify({
            'real_detalhado': {
                'custo_produto_brl': custo_produto_brl_real,
                'custo_iof_brl': custo_iof_brl_real,
                'custo_frete_brl': custo_frete_brl_real,
                'custo_total_brl': custo_total_real_brl,
                'iof_usado': iof_percent,
                'taxa_envio_usada': taxa_envio
            },
            # Novo objeto de resultado
            'estimativa_7_percent': {
                'custo_produto_brl': preco_base_brl,
                'custo_taxa_7_brl': custo_taxa_7_brl,
                'custo_iof_estimado_brl': custo_iof_estimado_brl,
                'custo_frete_brl': custo_frete_brl_real,  # Reutiliza o cálculo do frete
                'custo_total_brl': custo_total_estimado_brl,
                'taxa_7_usada': 7.0,
                'taxa_iof_usada': 3.5
            }
        }), 200

    except Exception as e:
        return jsonify({'erro': str(e)}), 400


# --- Ponto de Partida ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)