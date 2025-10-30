// frontend/src/components/StockItemForm.js
import React, { useState, useEffect } from "react";

function StockItemForm({ api, onItemAdded, globalSettings }) {

  // Lista de produtos do catálogo
  const [catalogo, setCatalogo] = useState([]);

  // Nome do produto digitado no input
  const [nomeProduto, setNomeProduto] = useState("");

  // O produto selecionado (ou null se for novo)
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  // Estado do formulário de *compra*
  const [formCompra, setFormCompra] = useState({});

  // Função para resetar o formulário
  const resetForm = () => {
    setNomeProduto("");
    setProdutoSelecionado(null);
    setFormCompra({
      preco_compra_usd: "",
      preco_venda_estimado_brl: "", // Campo para novo produto
      peso_kg: "",
      iof_percent: globalSettings.iof_percent || "",
      taxa_dolar: globalSettings.taxa_dolar || "",
      shipping_method: globalSettings.shipping_method || "Air",
    });
  };

  // 1. Carregar o catálogo de produtos
  useEffect(() => {
    api.get('/catalogo')
      .then(response => {
        setCatalogo(response.data);
      })
      .catch(error => console.error("Erro ao carregar catálogo:", error));
  }, []); // Roda só uma vez

  // 2. Preencher o formulário com configurações globais
  useEffect(() => {
    resetForm();
  }, [globalSettings]); // Reseta quando as configs mudam

  // 3. Lógica para o ComboBox (Datalist)
  const handleNomeChange = (e) => {
    const nome = e.target.value;
    setNomeProduto(nome);

    // Verifica se o nome digitado bate com um item do catálogo
    const match = catalogo.find(p => p.nome.toLowerCase() === nome.toLowerCase());
    if (match) {
      setProdutoSelecionado(match);
      // Limpa o preço de venda, pois já temos um
      setFormCompra(f => ({ ...f, preco_venda_estimado_brl: "" }));
    } else {
      setProdutoSelecionado(null); // É um produto novo
    }
  };

  const handleCompraChange = (e) => {
    setFormCompra({ ...formCompra, [e.target.name]: e.target.value });
  };

  // 4. Lógica de Envio (POST /estoque)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Se é novo e não tem preço de venda
    if (!produtoSelecionado && !formCompra.preco_venda_estimado_brl) {
      alert("Este é um produto novo. Por favor, defina um Preço de Venda Estimado.");
      return;
    }

    try {
      const dataToSend = {
        ...formCompra,
        nome_produto: nomeProduto, // Envia o nome
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
          <input
            id="nome_produto"
            name="nome_produto"
            value={nomeProduto}
            onChange={handleNomeChange}
            list="catalogo-list"
            placeholder="Digite ou selecione um produto"
            required
          />
          <datalist id="catalogo-list">
            {catalogo.map(p => (
              <option key={p.id} value={p.nome} />
            ))}
          </datalist>
        </div>

        {/* --- Campo Condicional de Preço de Venda --- */}
        {!produtoSelecionado && (
          <div className="input-group" style={{background: '#fffbe6'}}>
            <label htmlFor="preco_venda_estimado_brl">Preço Venda Estimado (BRL) (Novo Produto)</label>
            <input
              id="preco_venda_estimado_brl"
              name="preco_venda_estimado_brl"
              type="number" step="0.01"
              value={formCompra.preco_venda_estimado_brl}
              onChange={handleCompraChange}
              required
            />
          </div>
        )}

        {/* --- Seção de Custos da Compra --- */}
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
          <label htmlFor="form_dolar">Cotação Dólar (R$)</label>
          <input id="form_dolar" name="taxa_dolar" type="number" step="0.01" value={formCompra.taxa_dolar} onChange={handleCompraChange} required />
        </div>

        <div className="input-group">
          <label htmlFor="form_shipping">Método de Envio</label>
          <select id="form_shipping" name="shipping_method" value={formCompra.shipping_method} onChange={handleCompraChange}>
            <option value="Air">Aéreo ($22.50/kg)</option>
            <option value="Sea">Marítimo ($12.00/kg)</option>
          </select>
        </div>

        <div className="input-group">
          {/* ----- AQUI ESTÁ A CORREÇÃO ----- */}
          <label style={{ visibility: 'hidden' }}>Adicionar</label>
          <button type="submit">Adicionar ao Estoque</button>
        </div>

      </form>
    </div>
  );
}

export default StockItemForm;