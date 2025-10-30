# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import db
from sqlalchemy.sql import func
# 1. Importar UTC
from datetime import datetime, UTC
from models import ProdutoCatalogo, ItemEstoque, Venda, Transacao, ContaAPagar, ContaAReceber, LoteDeCusto, \
    AlocacaoCustoItem
from flask_migrate import Migrate

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///produtos.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
migrate = Migrate(app, db)

SHIPPING_RATES = {'Air': 22.5, 'Sea': 12.0}


# --- Funções Auxiliares (sem mudanças) ---
def recalcular_custos_e_lucro_item(item_id):
    item = ItemEstoque.query.get(item_id)
    if not item: return
    custo_adicional_brl = item.get_custo_adicional_total()
    custo_total_brl = item.custo_produto_brl + item.custo_iof_brl + item.custo_frete_brl + custo_adicional_brl
    preco_venda_estimado_brl = item.produto_catalogo.preco_venda_estimado_brl
    lucro_brl = preco_venda_estimado_brl - custo_total_brl
    lucro_percent = (lucro_brl / custo_total_brl) * 100 if custo_total_brl > 0 else 0
    item.custo_total_brl = custo_total_brl
    item.lucro_estimado_brl = lucro_brl
    item.lucro_estimado_percent = lucro_percent
    db.session.add(item)


def recalcular_lote_e_itens(lote, item_ids):
    lote.alocacoes.delete()
    if not item_ids:
        db.session.commit()
        return
    itens = ItemEstoque.query.filter(ItemEstoque.id.in_(item_ids)).all()
    if len(itens) != len(item_ids):
        raise Exception('Alguns IDs de itens não foram encontrados.')
    total_base_rateio = 0.0
    for item in itens:
        if lote.metodo_rateio == 'Valor':
            total_base_rateio += item.custo_produto_brl
        else:
            total_base_rateio += item.peso_kg
    if total_base_rateio == 0:
        raise Exception('O total do peso/valor dos itens é zero. Não é possível dividir por zero.')
    for item in itens:
        base_do_item = item.custo_produto_brl if lote.metodo_rateio == 'Valor' else item.peso_kg
        proporcao = base_do_item / total_base_rateio
        custo_alocado_para_o_item = lote.valor_total_brl * proporcao
        nova_alocacao = AlocacaoCustoItem(lote_id=lote.id, item_estoque_id=item.id,
                                          valor_alocado_brl=custo_alocado_para_o_item)
        db.session.add(nova_alocacao)
    db.session.flush()
    for item in itens:
        recalcular_custos_e_lucro_item(item.id)
    db.session.commit()


def calcular_custos_e_lucro(data, preco_venda_estimado_brl):
    preco_compra_usd = float(data.get('preco_compra_usd'));
    peso_kg = float(data.get('peso_kg'));
    iof_percent = float(data.get('iof_percent'));
    taxa_dolar = float(data.get('taxa_dolar'));
    shipping_method = data.get('shipping_method', 'Air');
    custo_adicional_brl = float(data.get('custo_adicional_brl', 0.0));
    shipping_rate = SHIPPING_RATES.get(shipping_method, SHIPPING_RATES['Air']);
    custo_produto_brl = preco_compra_usd * taxa_dolar;
    custo_iof_brl = (preco_compra_usd * (iof_percent / 100)) * taxa_dolar;
    custo_frete_brl = (peso_kg * shipping_rate) * taxa_dolar;
    custo_total_brl = custo_produto_brl + custo_iof_brl + custo_frete_brl + custo_adicional_brl;
    lucro_brl = preco_venda_estimado_brl - custo_total_brl;
    lucro_percent = (lucro_brl / custo_total_brl) * 100 if custo_total_brl > 0 else 0
    return {'custo_produto_brl': custo_produto_brl, 'custo_iof_brl': custo_iof_brl, 'custo_frete_brl': custo_frete_brl,
            'custo_adicional_brl': custo_adicional_brl, 'custo_total_brl': custo_total_brl,
            'lucro_estimado_brl': lucro_brl, 'lucro_estimado_percent': lucro_percent}


# --- ROTAS DO CATÁLOGO ---
@app.route('/catalogo', methods=['GET'])
def listar_catalogo():
    produtos = ProdutoCatalogo.query.order_by(ProdutoCatalogo.nome).all();
    return jsonify([p.to_dict() for p in produtos])


# --- ROTAS DO ESTOQUE ---
@app.route('/estoque', methods=['GET'])
def listar_estoque():
    itens = ItemEstoque.query.filter_by(status='Em Estoque').order_by(ItemEstoque.data_cadastro.desc()).all();
    return jsonify([item.to_dict() for item in itens])


@app.route('/estoque', methods=['POST'])
def adicionar_item_estoque():
    data = request.json
    try:
        nome_produto = data['nome_produto'];
        produto = ProdutoCatalogo.query.filter_by(nome=nome_produto).first()
        if not produto:
            if 'preco_venda_estimado_brl' not in data: return jsonify(
                {'erro': 'Preço de venda estimado é obrigatório para produtos novos.'}), 400
            produto = ProdutoCatalogo(nome=nome_produto,
                                      preco_venda_estimado_brl=float(data['preco_venda_estimado_brl']));
            db.session.add(produto);
            db.session.flush()
        data['custo_adicional_brl'] = 0.0
        calculos = calcular_custos_e_lucro(data, produto.preco_venda_estimado_brl)
        novo_item = ItemEstoque(
            produto_catalogo_id=produto.id, preco_compra_usd=float(data['preco_compra_usd']),
            peso_kg=float(data['peso_kg']), iof_percent=float(data['iof_percent']),
            taxa_dolar=float(data['taxa_dolar']), shipping_method=data.get('shipping_method', 'Air'),
            custo_produto_brl=calculos['custo_produto_brl'], custo_iof_brl=calculos['custo_iof_brl'],
            custo_frete_brl=calculos['custo_frete_brl'],
            custo_total_brl=calculos['custo_total_brl'],
            lucro_estimado_brl=calculos['lucro_estimado_brl'], lucro_estimado_percent=calculos['lucro_estimado_percent']
        );
        db.session.add(novo_item)
        db.session.commit()
        return jsonify(novo_item.to_dict()), 201
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


@app.route('/estoque/<int:id>', methods=['PUT'])
def atualizar_item_estoque(id):
    item = ItemEstoque.query.get_or_404(id);
    data = request.json
    try:
        if 'preco_venda_estimado_brl' in data:
            item.produto_catalogo.preco_venda_estimado_brl = float(data['preco_venda_estimado_brl'])

        item.preco_compra_usd = float(data.get('preco_compra_usd', item.preco_compra_usd));
        item.peso_kg = float(data.get('peso_kg', item.peso_kg));
        item.iof_percent = float(data.get('iof_percent', item.iof_percent));
        item.taxa_dolar = float(data.get('taxa_dolar', item.taxa_dolar));
        item.shipping_method = data.get('shipping_method', item.shipping_method)

        item.custo_produto_brl = item.preco_compra_usd * item.taxa_dolar
        item.custo_iof_brl = (item.preco_compra_usd * (item.iof_percent / 100)) * item.taxa_dolar
        shipping_rate = SHIPPING_RATES.get(item.shipping_method, SHIPPING_RATES['Air'])
        item.custo_frete_brl = (item.peso_kg * shipping_rate) * item.taxa_dolar

        recalcular_custos_e_lucro_item(item.id)

        db.session.commit();
        return jsonify(item.to_dict())
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


@app.route('/estoque/<int:id>', methods=['DELETE'])
def deletar_item_estoque(id):
    item = ItemEstoque.query.get_or_404(id)
    try:
        db.session.delete(item);
        db.session.commit()
        return jsonify({'message': 'Item removido do estoque com sucesso'})
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 500


@app.route('/estoque/<int:id>/vender', methods=['POST'])
def vender_item(id):
    item = ItemEstoque.query.get_or_404(id);
    data = request.json
    if item.status == 'Vendido': return jsonify({'erro': 'Este item já foi vendido.'}), 400
    try:
        preco_venda_final = float(data['preco_venda_final_brl']);
        metodo_pagamento = data.get('metodo_pagamento', 'AVista')
        # 2. CORREÇÃO: datetime.utcnow() -> datetime.now(UTC)
        data_venda = datetime.fromisoformat(data.get('data_venda', datetime.now(UTC).isoformat()))
        item.status = 'Vendido';
        lucro_real = preco_venda_final - item.custo_total_brl
        nova_venda = Venda(data_venda=data_venda, preco_venda_final_brl=preco_venda_final, lucro_real_brl=lucro_real,
                           item_id=item.id)
        db.session.add(nova_venda);
        db.session.flush()
        if metodo_pagamento == 'AVista':
            transacao_receita = Transacao(data=data_venda, tipo='Receita',
                                          descricao=f"Venda à vista de {item.produto_catalogo.nome} (Venda ID: {nova_venda.id})",
                                          valor_brl=preco_venda_final, item_estoque_id=item.id, venda_id=nova_venda.id)
            db.session.add(transacao_receita)
        elif metodo_pagamento == 'Parcelado':
            parcelas = data.get('parcelas', []);
            if not parcelas: raise Exception("Venda parcelada não contém parcelas.")
            for p in parcelas:
                conta = ContaAReceber(venda_id=nova_venda.id,
                                      descricao=p.get('descricao', f"Parcela Venda {nova_venda.id}"),
                                      valor_parcela_brl=float(p['valor']),
                                      data_vencimento=datetime.fromisoformat(p['data']), status='Pendente')
                db.session.add(conta)
        db.session.commit();
        return jsonify(nova_venda.to_dict()), 201
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


@app.route('/vendas', methods=['GET'])
def listar_vendas():
    vendas = Venda.query.order_by(Venda.data_venda.desc()).all();
    return jsonify([v.to_dict() for v in vendas])


# --- ROTAS FINANCEIRAS ---
@app.route('/financeiro/balanco', methods=['GET'])
def get_balanco_financeiro():
    try:
        total_receitas = db.session.query(func.sum(Transacao.valor_brl)).filter(
            Transacao.tipo == 'Receita').scalar() or 0.0;
        total_custos = db.session.query(func.sum(Transacao.valor_brl)).filter(
            Transacao.tipo == 'Custo').scalar() or 0.0;
        balanco_total = total_receitas - total_custos;
        total_a_pagar = db.session.query(func.sum(ContaAPagar.valor_brl)).filter(
            ContaAPagar.status == 'Pendente').scalar() or 0.0;
        total_a_receber = db.session.query(func.sum(ContaAReceber.valor_parcela_brl)).filter(
            ContaAReceber.status == 'Pendente').scalar() or 0.0
        total_estoque_valor_venda_brl = db.session.query(func.sum(ProdutoCatalogo.preco_venda_estimado_brl)).join(
            ItemEstoque).filter(ItemEstoque.status == 'Em Estoque').scalar() or 0.0
        patrimonio_total_projetado_brl = balanco_total + total_a_receber + total_estoque_valor_venda_brl - total_a_pagar
        return jsonify(
            {'total_receitas_brl': total_receitas, 'total_custos_brl': total_custos, 'balanco_total_brl': balanco_total,
             'total_a_pagar_brl': total_a_pagar, 'total_a_receber_brl': total_a_receber,
             'total_estoque_valor_venda_brl': total_estoque_valor_venda_brl,
             'patrimonio_total_projetado_brl': patrimonio_total_projetado_brl}), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500


@app.route('/financeiro/transacao-manual', methods=['POST'])
def adicionar_transacao_manual():
    data = request.json
    try:
        tipo = data['tipo'];
        if tipo not in ['Receita', 'Custo']: return jsonify({'erro': "Tipo deve ser 'Receita' ou 'Custo'"}), 400
        data_transacao = datetime.fromisoformat(data['data'])
        # 3. CORREÇÃO: datetime.utcnow() -> datetime.now(UTC)
        if data_transacao.date() > datetime.now(UTC).date():
            return jsonify({
                               'erro': "Esta data é futura. Use 'Registrar Custo Futuro' ou 'Registrar Recebimento Futuro' para agendamentos."}), 400
        transacao = Transacao(tipo=tipo, descricao=data['descricao'], valor_brl=float(data['valor_brl']),
                              data=data_transacao, is_manual=True)
        db.session.add(transacao);
        db.session.commit()
        return jsonify(transacao.to_dict()), 201
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


@app.route('/financeiro/transacoes-manuais', methods=['GET'])
def listar_transacoes_manuais():
    transacoes = Transacao.query.filter_by(is_manual=True).order_by(Transacao.data.desc()).all();
    return jsonify([t.to_dict() for t in transacoes])


@app.route('/financeiro/transacao-manual/<int:id>', methods=['PUT'])
def atualizar_transacao_manual(id):
    transacao = Transacao.query.get_or_404(id)
    if not transacao.is_manual: return jsonify({'erro': 'Não é permitido editar uma transação automática.'}), 403
    data = request.json
    try:
        transacao.tipo = data.get('tipo', transacao.tipo);
        transacao.descricao = data.get('descricao', transacao.descricao);
        transacao.valor_brl = float(data.get('valor_brl', transacao.valor_brl));
        transacao.data = datetime.fromisoformat(data.get('data', transacao.data.isoformat()));
        db.session.commit();
        return jsonify(transacao.to_dict())
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


@app.route('/financeiro/transacao-manual/<int:id>', methods=['DELETE'])
def deletar_transacao_manual(id):
    transacao = Transacao.query.get_or_404(id)
    if not transacao.is_manual: return jsonify({'erro': 'Não é permitido excluir uma transação automática.'}), 403
    try:
        db.session.delete(transacao);
        db.session.commit()
        return jsonify({'message': 'Transação manual removida com sucesso'})
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 500


# --- ROTAS CONTAS A PAGAR ---
@app.route('/contas-a-pagar', methods=['GET'])
def listar_contas_a_pagar():
    status_filtro = request.args.get('status', 'Pendente');
    contas = ContaAPagar.query.filter_by(status=status_filtro).order_by(ContaAPagar.data_vencimento.asc()).all();
    return jsonify([c.to_dict() for c in contas])


@app.route('/contas-a-pagar', methods=['POST'])
def adicionar_conta_a_pagar():
    data = request.json
    try:
        nova_conta = ContaAPagar(descricao=data['descricao'], valor_brl=float(data['valor_brl']),
                                 data_vencimento=datetime.fromisoformat(data['data_vencimento']));
        db.session.add(nova_conta);
        db.session.commit();
        return jsonify(nova_conta.to_dict()), 201
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


@app.route('/contas-a-pagar/<int:id>/pagar', methods=['POST'])
def pagar_conta(id):
    conta = ContaAPagar.query.get_or_404(id)
    if conta.status == 'Pago': return jsonify({'erro': 'Esta conta já foi paga.'}), 400
    try:
        transacao_pagamento = Transacao(tipo='Custo',
                                        descricao=f"Pagamento de conta: {conta.descricao} (ID Conta: {conta.id})",
                                        valor_brl=conta.valor_brl);
        db.session.add(transacao_pagamento);
        db.session.flush()
        conta.status = 'Pago';
        conta.transacao_id = transacao_pagamento.id;
        db.session.commit()
        return jsonify(conta.to_dict())
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


@app.route('/contas-a-pagar/<int:id>', methods=['PUT'])
def atualizar_conta_a_pagar(id):
    conta = ContaAPagar.query.get_or_404(id)
    if conta.status == 'Pago': return jsonify({'erro': 'Não é possível editar uma conta que já foi paga.'}), 400
    data = request.json
    try:
        conta.descricao = data.get('descricao', conta.descricao);
        conta.valor_brl = float(data.get('valor_brl', conta.valor_brl));
        conta.data_vencimento = datetime.fromisoformat(data.get('data_vencimento', conta.data_vencimento.isoformat()));
        db.session.commit();
        return jsonify(conta.to_dict())
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


@app.route('/contas-a-pagar/<int:id>', methods=['DELETE'])
def deletar_conta_a_pagar(id):
    conta = ContaAPagar.query.get_or_404(id)
    if conta.status == 'Pago': return jsonify({'erro': 'Não é possível excluir uma conta que já foi paga.'}), 400
    try:
        db.session.delete(conta);
        db.session.commit()
        return jsonify({'message': 'Conta a pagar removida com sucesso'})
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 500


@app.route('/contas-a-pagar/<int:id>/reverter', methods=['POST'])
def reverter_pagamento_conta(id):
    conta = ContaAPagar.query.get_or_404(id)
    if conta.status == 'Pendente': return jsonify({'erro': 'Esta conta já está pendente.'}), 400
    try:
        if conta.transacao_id:
            transacao = Transacao.query.get(conta.transacao_id)
            if transacao:
                db.session.delete(transacao)
        conta.status = 'Pendente';
        conta.transacao_id = None
        db.session.commit()
        return jsonify(conta.to_dict())
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 500


# --- ROTAS CONTAS A RECEBER ---
@app.route('/contas-a-receber', methods=['GET'])
def listar_contas_a_receber():
    status_filtro = request.args.get('status', 'Pendente');
    contas = ContaAReceber.query.filter_by(status=status_filtro).order_by(ContaAReceber.data_vencimento.asc()).all();
    return jsonify([c.to_dict() for c in contas])


@app.route('/contas-a-receber-manual', methods=['POST'])
def adicionar_conta_a_receber_manual():
    data = request.json
    try:
        nova_conta = ContaAReceber(venda_id=None, descricao=data['descricao'],
                                   valor_parcela_brl=float(data['valor_brl']),
                                   data_vencimento=datetime.fromisoformat(data['data_vencimento']), status='Pendente')
        db.session.add(nova_conta);
        db.session.commit()
        return jsonify(nova_conta.to_dict()), 201
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


@app.route('/contas-a-receber/<int:id>/receber', methods=['POST'])
def receber_conta(id):
    conta = ContaAReceber.query.get_or_404(id)
    if conta.status == 'Pago': return jsonify({'erro': 'Esta conta já foi recebida.'}), 400
    try:
        transacao_recebimento = Transacao(tipo='Receita',
                                          descricao=f"Recebimento: {conta.descricao} (ID Receb.: {conta.id})",
                                          valor_brl=conta.valor_parcela_brl);
        db.session.add(transacao_recebimento);
        db.session.flush()
        conta.status = 'Pago';
        conta.transacao_id = transacao_recebimento.id;
        db.session.commit()
        return jsonify(conta.to_dict())
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


@app.route('/contas-a-receber/<int:id>', methods=['PUT'])
def atualizar_conta_a_receber(id):
    conta = ContaAReceber.query.get_or_404(id)
    if conta.status == 'Pago': return jsonify({'erro': 'Não é possível editar uma conta que já foi recebida.'}), 400
    data = request.json
    try:
        conta.descricao = data.get('descricao', conta.descricao);
        conta.valor_parcela_brl = float(data.get('valor_parcela_brl', conta.valor_parcela_brl));
        conta.data_vencimento = datetime.fromisoformat(data.get('data_vencimento', conta.data_vencimento.isoformat()));
        db.session.commit();
        return jsonify(conta.to_dict())
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


@app.route('/contas-a-receber/<int:id>', methods=['DELETE'])
def deletar_conta_a_receber(id):
    conta = ContaAReceber.query.get_or_404(id)
    if conta.status == 'Pago': return jsonify({'erro': 'Não é possível excluir uma conta que já foi recebida.'}), 400
    try:
        db.session.delete(conta);
        db.session.commit()
        return jsonify({'message': 'Conta a receber removida com sucesso'})
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 500


# --- ROTA DE ESTIMATIVA ---
@app.route('/estimativa/calcular', methods=['POST'])
def calcular_estimativa():
    data = request.json
    try:
        preco_compra_usd = float(data['preco_compra_usd']);
        peso_kg = float(data['peso_kg']);
        iof_percent = float(data['iof_percent']);
        taxa_dolar = float(data['taxa_dolar']);
        shipping_method = data.get('shipping_method', 'Air');
        taxa_envio = SHIPPING_RATES.get(shipping_method, SHIPPING_RATES['Air']);
        custo_frete_brl_real = (peso_kg * taxa_envio) * taxa_dolar;
        custo_produto_brl_real = preco_compra_usd * taxa_dolar;
        custo_iof_brl_real = (preco_compra_usd * (iof_percent / 100)) * taxa_dolar;
        custo_total_real_brl = custo_produto_brl_real + custo_iof_brl_real + custo_frete_brl_real;
        preco_base_brl = preco_compra_usd * taxa_dolar;
        TAXA_7_PERCENT = 0.07;
        custo_taxa_7_brl = preco_base_brl * TAXA_7_PERCENT;
        valor_com_taxa_7 = preco_base_brl + custo_taxa_7_brl;
        TAXA_IOF_ESTIMADA_PERCENT = 0.035;
        custo_iof_estimado_brl = valor_com_taxa_7 * TAXA_IOF_ESTIMADA_PERCENT;
        valor_com_iof = valor_com_taxa_7 + custo_iof_estimado_brl;
        custo_total_estimado_brl = valor_com_iof + custo_frete_brl_real
        return jsonify({'real_detalhado': {'custo_produto_brl': custo_produto_brl_real,
                                           'custo_iof_brl': custo_iof_brl_real, 'custo_frete_brl': custo_frete_brl_real,
                                           'custo_total_brl': custo_total_real_brl, 'iof_usado': iof_percent,
                                           'taxa_envio_usada': taxa_envio},
                        'estimativa_7_percent': {'custo_produto_brl': preco_base_brl,
                                                 'custo_taxa_7_brl': custo_taxa_7_brl,
                                                 'custo_iof_estimado_brl': custo_iof_estimado_brl,
                                                 'custo_frete_brl': custo_frete_brl_real,
                                                 'custo_total_brl': custo_total_estimado_brl, 'taxa_7_usada': 7.0,
                                                 'taxa_iof_usada': 3.5}}), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 400


# --- ROTAS DE LOTE DE CUSTO ---
@app.route('/lotes-de-custo', methods=['GET'])
def listar_lotes_de_custo():
    lotes = LoteDeCusto.query.order_by(LoteDeCusto.id.desc()).all();
    return jsonify([l.to_dict() for l in lotes])


@app.route('/lotes-de-custo', methods=['POST'])
def criar_lote_de_custo():
    data = request.json
    try:
        nova_conta = ContaAPagar(
            descricao=f"Custo Logístico: {data['descricao']}",
            valor_brl=float(data['valor_total_brl']),
            # 4. CORREÇÃO: datetime.utcnow() -> datetime.now(UTC)
            data_vencimento=datetime.now(UTC)
        );
        db.session.add(nova_conta);
        db.session.flush()
        novo_lote = LoteDeCusto(descricao=data['descricao'], valor_total_brl=float(data['valor_total_brl']),
                                metodo_rateio=data.get('metodo_rateio', 'Peso'), conta_a_pagar_id=nova_conta.id);
        db.session.add(novo_lote);
        db.session.flush()
        recalcular_lote_e_itens(novo_lote, data.get('item_ids', []));
        return jsonify(novo_lote.to_dict()), 201
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


@app.route('/lotes-de-custo/<int:id>', methods=['PUT'])
def atualizar_lote_de_custo(id):
    lote = LoteDeCusto.query.get_or_404(id);
    conta_a_pagar = ContaAPagar.query.get(lote.conta_a_pagar_id)
    if conta_a_pagar.status == 'Pago': return jsonify({'erro': 'Não é possível editar um lote que já foi pago.'}), 400
    data = request.json
    try:
        ids_afetados_antes = [a.item_estoque_id for a in lote.alocacoes]
        lote.descricao = data.get('descricao', lote.descricao);
        lote.valor_total_brl = float(data.get('valor_total_brl', lote.valor_total_brl));
        lote.metodo_rateio = data.get('metodo_rateio', lote.metodo_rateio)
        conta_a_pagar.descricao = f"Custo Logístico: {lote.descricao}";
        conta_a_pagar.valor_brl = lote.valor_total_brl
        novos_item_ids = data.get('item_ids', []);
        recalcular_lote_e_itens(lote, novos_item_ids)
        ids_afetados_depois = set(novos_item_ids);
        ids_removidos = [id for id in ids_afetados_antes if id not in ids_afetados_depois]
        for item_id in ids_removidos:
            recalcular_custos_e_lucro_item(item_id)
        db.session.commit()
        return jsonify(lote.to_dict())
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


@app.route('/lotes-de-custo/<int:id>', methods=['DELETE'])
def deletar_lote_de_custo(id):
    lote = LoteDeCusto.query.get_or_404(id);
    conta_a_pagar = ContaAPagar.query.get(lote.conta_a_pagar_id)
    if conta_a_pagar.status == 'Pago': return jsonify({'erro': 'Não é possível excluir um lote que já foi pago.'}), 400
    try:
        ids_afetados = [a.item_estoque_id for a in lote.alocacoes]
        db.session.delete(lote);
        db.session.delete(conta_a_pagar);
        db.session.flush()
        for item_id in ids_afetados:
            recalcular_custos_e_lucro_item(item_id)
        db.session.commit()
        return jsonify({'message': 'Lote de custo e conta a pagar associada foram removidos.'})
    except Exception as e:
        db.session.rollback();
        return jsonify({'erro': str(e)}), 400


# --- Ponto de Partida ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)