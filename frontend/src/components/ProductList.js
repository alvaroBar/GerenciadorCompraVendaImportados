import React, { useEffect, useState } from "react";

function ProductList({ api }) {
  const [products, setProducts] = useState([]);

  const loadProducts = async () => {
    const response = await api.get("/produtos");
    setProducts(response.data);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div>
      <h2>Lista de Produtos</h2>
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Compra</th>
            <th>Venda</th>
            <th>Lucro (%)</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.nome}</td>
              <td>{p.preco_compra}</td>
              <td>{p.preco_venda}</td>
              <td>{(((p.preco_venda - p.preco_compra) / p.preco_compra) * 100).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProductList;
