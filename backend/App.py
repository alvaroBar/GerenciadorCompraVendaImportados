# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import db, init_db
from models import Product

app = Flask(__name__)
CORS(app)

# O app está configurado para usar 'produtos.db'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///produtos.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)


# --- Rotas ---
@app.route('/produtos', methods=['GET'])
def listar_produtos():
    produtos = Product.query.all()
    return jsonify([p.to_dict() for p in produtos])


@app.route('/produtos', methods=['POST'])
def adicionar_produto():
    data = request.json or {}

    nome = data.get('nome')
    # Correção: Lendo os campos corretos do frontend
    preco_compra = data.get('preco_compra')
    preco_venda = data.get('preco_venda')
    peso = data.get('peso')

    if nome is None:
        return jsonify({'erro': "Campo 'nome' é obrigatório"}), 400
    if preco_compra is None:
        return jsonify({'erro': "Campo 'preco_compra' é obrigatório"}), 400
    if preco_venda is None:
        return jsonify({'erro': "Campo 'preco_venda' é obrigatório"}), 400
    if peso is None:
        return jsonify({'erro': "Campo 'peso' é obrigatório"}), 400

    try:
        preco_compra = float(preco_compra)
        preco_venda = float(preco_venda)
        peso = float(peso)
    except ValueError:
        return jsonify({'erro': "Campos numéricos devem ser números válidos"}), 400

    # Correção: Passando os argumentos corretos para o construtor do Product
    novo_produto = Product(
        nome=nome,
        preco_compra=preco_compra,
        preco_venda=preco_venda,
        peso=peso
    )

    db.session.add(novo_produto)
    db.session.commit()
    return jsonify(novo_produto.to_dict()), 201


@app.route('/produtos/<int:id>', methods=['PUT'])
def atualizar_produto(id):
    produto = Product.query.get_or_404(id)
    data = request.json

    produto.nome = data.get('nome', produto.nome)
    # Correção: Atualizando os campos corretos
    produto.preco_compra = float(data.get('preco_compra', produto.preco_compra))
    produto.preco_venda = float(data.get('preco_venda', produto.preco_venda))
    produto.peso = float(data.get('peso', produto.peso))

    db.session.commit()
    return jsonify(produto.to_dict())


@app.route('/produtos/<int:id>', methods=['DELETE'])
def deletar_produto(id):
    produto = Product.query.get_or_404(id)
    db.session.delete(produto)
    db.session.commit()
    return jsonify({'message': 'Produto removido com sucesso'})


if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True)