import React, { useState } from "react";

function Simulation() {
  const [data, setData] = useState({
    preco_compra: "",
    preco_venda: "",
    peso: "",
    iof: "",
  });
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const calcular = () => {
    const precoCompra = parseFloat(data.preco_compra);
    const precoVenda = parseFloat(data.preco_venda);
    const peso = parseFloat(data.peso);
    const iof = parseFloat(data.iof) / 100;
    const frete = 22.5 * peso;
    const custoTotal = precoCompra * (1 + iof) + frete;
    const lucro = precoVenda - custoTotal;
    const lucroPercent = (lucro / custoTotal) * 100;

    setResult({
      frete: frete.toFixed(2),
      custoTotal: custoTotal.toFixed(2),
      lucro: lucro.toFixed(2),
      lucroPercent: lucroPercent.toFixed(2),
    });
  };

  return (
    <div>
      <h2>Simulação de Compra</h2>
      <input name="preco_compra" placeholder="Preço de compra" onChange={handleChange} />
      <input name="preco_venda" placeholder="Preço de venda" onChange={handleChange} />
      <input name="peso" placeholder="Peso (kg)" onChange={handleChange} />
      <input name="iof" placeholder="IOF (%)" onChange={handleChange} />
      <button onClick={calcular}>Calcular</button>

      {result && (
        <div>
          <p>Frete (US$): {result.frete}</p>
          <p>Custo total (US$): {result.custoTotal}</p>
          <p>Lucro: {result.lucro}</p>
          <p>Lucro (%): {result.lucroPercent}%</p>
        </div>
      )}
    </div>
  );
}

export default Simulation;
