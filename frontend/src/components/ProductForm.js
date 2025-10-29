// components/ProductForm.js
import React, { useState, useEffect } from "react";

function ProductForm({ api, onProductSaved, globalSettings }) {

  const createInitialState = () => ({
    nome: "",
    preco_compra: "",
    preco_venda: "",
    peso: "",
    iof_percent: globalSettings.iof_percent || "",
    taxa_dolar: globalSettings.taxa_dolar || "",
    shipping_method: globalSettings.shipping_method || "Air", // 1. Adicionar ao estado inicial
  });

  const [form, setForm] = useState(createInitialState());
  const [moedaCompra, setMoedaCompra] = useState("USD");

  useEffect(() => {
    setForm(f => ({
      ...f,
      iof_percent: globalSettings.iof_percent,
      taxa_dolar: globalSettings.taxa_dolar,
      shipping_method: globalSettings.shipping_method, // 2. Atualizar com config global
    }));
  }, [globalSettings]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // ... (lógica de conversão de moeda permanece a mesma)
      let precoCompraEmUSD = parseFloat(form.preco_compra);
      const taxaDolar = parseFloat(form.taxa_dolar);

      if (moedaCompra === "BRL") {
        if (!taxaDolar || taxaDolar === 0) {
          alert("A 'Cotação do Dólar' deve ser maior que zero...");
          return;
        }
        precoCompraEmUSD = precoCompraEmUSD / taxaDolar;
      }

      // 3. O 'dataToSend' agora inclui 'shipping_method'
      // O backend calculará o 'frete_usd'
      const dataToSend = {
        ...form, // Isso já inclui nome, peso, iof, dolar, shipping_method
        preco_compra: precoCompraEmUSD,
        preco_venda: parseFloat(form.preco_venda),
        peso: parseFloat(form.peso),
      };

      await api.post("/produtos", dataToSend);
      alert("Produto cadastrado!");
      setForm(createInitialState());
      setMoedaCompra("USD");
      onProductSaved();

    } catch (error) {
      const errorMsg = error.response?.data?.erro || "Erro ao salvar produto.";
      alert(errorMsg);
    }
  };

  // --- JSX (Renderização) ---
  return (
    <div>
      <h2>Cadastrar Produto</h2>
      <form onSubmit={handleSubmit}>
        {/* ... (Campos Nome, Preço Compra, Preço Venda) ... */}

        <div className="input-group">
          <label htmlFor="nome">Nome</label>
          <input id="nome" name="nome" value={form.nome} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label htmlFor="preco_compra">Preço Compra</label>
          <input id="preco_compra" name="preco_compra" type="number" step="0.01" value={form.preco_compra} onChange={handleChange} required />
          <select value={moedaCompra} onChange={(e) => setMoedaCompra(e.target.value)}>
            <option value="USD">USD ($)</option>
            <option value="BRL">BRL (R$)</option>
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="preco_venda">Preço Venda (BRL)</label>
          <input id="preco_venda" name="preco_venda" type="number" step="0.01" value={form.preco_venda} onChange={handleChange} required />
        </div>

        {/* ... (Campo Peso, IOF, Dólar) ... */}
        <div className="input-group">
          <label htmlFor="peso">Peso (kg)</label>
          <input id="peso" name="peso" type="number" step="0.01" value={form.peso} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label htmlFor="form_iof">IOF (%)</label>
          <input id="form_iof" name="iof_percent" type="number" step="0.01" value={form.iof_percent} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label htmlFor="form_dolar">Cotação Dólar (R$)</label>
          <input id="form_dolar" name="taxa_dolar" type="number" step="0.01" value={form.taxa_dolar} onChange={handleChange} required />
        </div>

        {/* --- 4. Novo Seletor no Formulário de Cadastro --- */}
        <div className="input-group">
          <label htmlFor="form_shipping">Método de Envio</label>
          <select
            id="form_shipping"
            name="shipping_method"
            value={form.shipping_method}
            onChange={handleChange}
          >
            <option value="Air">Aéreo ($22.50/kg)</option>
            <option value="Sea">Marítimo ($12.00/kg)</option>
          </select>
        </div>

        {/* Botão Salvar */}
        <div className="input-group">
          <label style={{ visibility: 'hidden' }}>Salvar</label>
          <button type="submit">Salvar</button>
        </div>

      </form>
    </div>
  );
}

export default ProductForm;