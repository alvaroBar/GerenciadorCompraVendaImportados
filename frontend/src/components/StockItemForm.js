// frontend/src/components/StockItemForm.js
import React, { useState, useEffect } from "react";

const getTodayDate = () => new Date().toISOString().split('T')[0];

function StockItemForm({ api, onItemAdded, globalSettings }) {

  const [catalogo, setCatalogo] = useState([]);
  const [nomeProduto, setNomeProduto] = useState("");
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [loadingRate, setLoadingRate] = useState(false); // Loading só para a cotação

  // 1. O estado inicial JÁ INCLUI a data da compra
  const createInitialState = () => ({
    preco_compra_usd: "",
    preco_venda_estimado_brl: "",
    peso_kg: "",
    data_compra: getTodayDate(), // <-- CAMPO DE DATA
    iof_percent: globalSettings.iof_percent || "",
    taxa_dolar: globalSettings.taxa_dolar || "",
    shipping_method: globalSettings.shipping_method || "Air",
  });

  const [formCompra, setFormCompra] = useState(createInitialState());

  // Carregar o catálogo
  useEffect(() => {
    api.get('/catalogo')
      .then(response => setCatalogo(response.data))
      .catch(error => console.error("Erro ao carregar catálogo:", error));
  }, []);

  // Preencher o formulário com configurações globais
  useEffect(() => {
    resetForm();
  }, [globalSettings]);

  // 2. ESTA É A LÓGICA QUE BUSCA A COTAÇÃO
  useEffect(() => {
    const data = formCompra.data_compra;
    if (data) {
      fetchRate(data);
    }
  }, [formCompra.data_compra]); // Roda quando a data_compra muda

  const fetchRate = async (date) => {
    try {
      setLoadingRate(true);
      const response = await api.get(`/api/get-exchange-rate?date=${date}`);
      setFormCompra(f => ({ ...f, taxa_dolar: response.data.rate.toFixed(4) }));
    } catch (error) {
      console.error("Erro ao buscar cotação:", error);
      setFormCompra(f => ({ ...f, taxa_dolar: globalSettings.taxa_dolar }));
    } finally {
      setLoadingRate(false);
    }
  };

  const resetForm = () => {
    setNomeProduto("");
    setProdutoSelecionado(null);
    setFormCompra(createInitialState());
  };

  const handleNomeChange = (e) => {
    const nome = e.target.value;
    setNomeProduto(nome);
    const match = catalogo.find(p => p.nome.toLowerCase() === nome.toLowerCase());
    if (match) {
      setProdutoSelecionado(match);
      setFormCompra(f => ({ ...f, preco_venda_estimado_brl: "" }));
    } else {
      setProdutoSelecionado(null);
    }
  };

  const handleCompraChange = (e) => {
    setFormCompra({ ...formCompra, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!produtoSelecionado && !formCompra.preco_venda_estimado_brl) {
      alert("Este é um produto novo. Por favor, defina um Preço de Venda Estimado.");
      return;
    }

    try {
      // O formCompra já contém a 'data_compra'
      const dataToSend = {
        ...formCompra,
        nome_produto: nomeProduto,
      };

      await api.post("/estoque", dataToSend);
      alert("Item adicionado ao estoque!");
      resetForm();
      onItemAdded();

    } catch (error) {
      const errorMsg = error.response?.data?.erro || "Erro ao adicionar item.";
      alert(errorMsg);
    }
  };

  return (
    <div>
      <h2>Adicionar Item ao Estoque</h2>
      <form onSubmit={handleSubmit}>

        {/* --- Seção do Produto --- */}
        <div className="input-group">
          <label htmlFor="nome_produto">Nome do Produto</label>
          <input id="nome_produto" name="nome_produto" value={nomeProduto} onChange={handleNomeChange} list="catalogo-list" placeholder="Digite ou selecione um produto" required />
          <datalist id="catalogo-list">
            {catalogo.map(p => ( <option key={p.id} value={p.nome} /> ))}
          </datalist>
        </div>

        {/* --- Campo Condicional de Preço de Venda --- */}
        {!produtoSelecionado && (
          <div className="input-group" style={{background: '#fffbe6'}}>
            <label htmlFor="preco_venda_estimado_brl">Preço Venda Estimado (BRL) (Novo Produto)</label>
            <input id="preco_venda_estimado_brl" name="preco_venda_estimado_brl" type="number" step="0.01" value={formCompra.preco_venda_estimado_brl} onChange={handleCompraChange} required />
          </div>
        )}

        {/* --- Seção de Custos da Compra --- */}

        {/* 3. O CAMPO DE DATA DA COMPRA */}
        <div className="input-group">
          <label htmlFor="data_compra">Data da Compra</label>
          <input id="data_compra" name="data_compra" type="date" value={formCompra.data_compra} onChange={handleCompraChange} required />
        </div>

        {/* 4. O CAMPO DE COTAÇÃO (auto-preenchido) */}
        <div className="input-group">
          <label htmlFor="form_dolar">Cotação Dólar (R$)</label>
          <input id="form_dolar" name="taxa_dolar" type="number" step="0.0001" value={formCompra.taxa_dolar} onChange={handleCompraChange} placeholder={loadingRate ? "Buscando..." : ""} required />
        </div>

        <div className="input-group">
          <label htmlFor="preco_compra_usd">Preço Compra (USD)</label>
          <input id="preco_compra_usd" name="preco_compra_usd" type="number" step="0.01" value={formCompra.preco_compra_usd} onChange={handleCompraChange} required />
        </div>

        <div className="input-group">
          <label htmlFor="peso_kg">Peso (kg)</label>
          <input id="peso_kg" name="peso_kg" type="number" step="0.01" value={formCompra.peso_kg} onChange={handleCompraChange} required />
        </div>

        <div className="input-group">
          <label htmlFor="form_iof">IOF (%)</label>
          <input id="form_iof" name="iof_percent" type="number" step="0.01" value={formCompra.iof_percent} onChange={handleCompraChange} required />
        </div>

        <div className="input-group">
          <label htmlFor="form_shipping">Método de Envio</label>
          <select id="form_shipping" name="shipping_method" value={formCompra.shipping_method} onChange={handleCompraChange}>
            <option value="Air">Aéreo ($22.50/kg)</option>
            <option value="Sea">Marítimo ($12.00/kg)</option>
          </select>
        </div>

        <div className="input-group">
          <label style={{ visibility: 'hidden' }}>Adicionar</label>
          <button type="submit">Adicionar ao Estoque</button>
        </div>

      </form>
    </div>
  );
}

export default StockItemForm;