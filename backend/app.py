# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import db
from models import Product

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///produtos.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Definir as taxas de frete globalmente
SHIPPING_RATES = {
    'Air': 22.5,  # Aéreo (Padrão)
    'Sea': 12.0  # Marítimo
}


# --- Rota GET (Listar Produtos) ---
# ESTA É A ROTA QUE ESTAVA FALTANDO
@app.route('/produtos', methods=['GET'])
def listar_produtos():
    produtos = Product.query.all()
    # Ordena os produtos do mais novo para o mais antigo
    produtos_ordenados = sorted(produtos, key=lambda p: p.data_cadastro, reverse=True)
    return jsonify([p.to_dict() for p in produtos_ordenados])


# --- Rota POST (Adicionar Produto) ---
@app.route('/produtos', methods=['POST'])
def adicionar_produto():
    data = request.json or {}

    required_fields = ['nome', 'preco_compra', 'preco_venda', 'peso', 'iof_percent', 'taxa_dolar']
    if any(data.get(f) is None for f in required_fields):
        campos_faltando = [f for f in required_fields if data.get(f) is None]
        return jsonify({'erro': f"Campos obrigatórios faltando: {', '.join(campos_faltando)}"}), 400

    try:
        peso = float(data.get('peso'))
        preco_compra = float(data.get('preco_compra'))
        preco_venda = float(data.get('preco_venda'))
        iof_percent = float(data.get('iof_percent'))
        taxa_dolar = float(data.get('taxa_dolar'))
    except ValueError:
        return jsonify({'erro': "Campos numéricos devem ser números válidos"}), 400

    shipping_method = data.get('shipping_method', 'Air')
    shipping_rate = SHIPPING_RATES.get(shipping_method, SHIPPING_RATES['Air'])
    frete_usd = peso * shipping_rate

    novo_produto = Product(
        nome=data.get('nome'),
        preco_compra=preco_compra,
        preco_venda=preco_venda,
        peso=peso,
        iof_percent=iof_percent,
        taxa_dolar=taxa_dolar,
        shipping_method=shipping_method,
        frete_usd=frete_usd
    )

    db.session.add(novo_produto)
    db.session.commit()
    return jsonify(novo_produto.to_dict()), 201


# --- Rota PUT (Atualizar Produto) ---
@app.route('/produtos/<int:id>', methods=['PUT'])
def atualizar_produto(id):
    produto = Product.query.get_or_404(id)
    data = request.json

    try:
        produto.nome = data.get('nome', produto.nome)
        produto.preco_compra = float(data.get('preco_compra', produto.preco_compra))
        produto.preco_venda = float(data.get('preco_venda', produto.preco_venda))
        produto.peso = float(data.get('peso', produto.peso))
        produto.iof_percent = float(data.get('iof_percent', produto.iof_percent))
        produto.taxa_dolar = float(data.get('taxa_dolar', produto.taxa_dolar))

        produto.shipping_method = data.get('shipping_method', produto.shipping_method)
        shipping_rate = SHIPPING_RATES.get(produto.shipping_method, SHIPPING_RATES['Air'])

        produto.frete_usd = produto.peso * shipping_rate

        db.session.commit()
        return jsonify(produto.to_dict())
    except ValueError:
        return jsonify({'erro': "Campos numéricos devem ser números válidos"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500


# --- Rota DELETE ---
@app.route('/produtos/<int:id>', methods=['DELETE'])
def deletar_produto(id):
    produto = Product.query.get_or_404(id)
    try:
        db.session.delete(produto)
        db.session.commit()
        return jsonify({'message': 'Produto removido com sucesso'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)