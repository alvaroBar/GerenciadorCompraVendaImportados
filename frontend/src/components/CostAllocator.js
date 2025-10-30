// frontend/src/components/CostAllocator.js
import React, { useState, useEffect } from "react";

function CostAllocator({ api, onDataChanged }) {
  const [descricao, setDescricao] = useState("");
  const [custoTotal, setCustoTotal] = useState("");
  const [metodo, setMetodo] = useState("Peso");

  const [stockItems, setStockItems] = useState([]); // Lista de itens do estoque
  const [selectedItems, setSelectedItems] = useState(new Set()); // IDs dos itens selecionados

  // 1. Carrega os itens 'Em Estoque' para a lista de seleção
  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await api.get("/estoque?status=Em Estoque");
        setStockItems(response.data);
      } catch (error) {
        console.error("Erro ao carregar itens de estoque:", error);
      }
    };
    loadItems();
  }, []); // Roda só na montagem

  // 2. Controla a seleção dos checkboxes
  const handleSelect = (itemId) => {
    setSelectedItems(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  };

  // 3. Envia os dados para a API de alocação
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.size === 0) {
      alert("Por favor, selecione pelo menos um item para alocar o custo.");
      return;
    }

    try {
      await api.post('/estoque/alocar-custo', {
        custo_total_brl: parseFloat(custoTotal),
        descricao: descricao,
        metodo_rateio: metodo,
        item_ids: Array.from(selectedItems) // Converte o Set para Array
      });

      alert('Custo alocado com sucesso!');
      // Limpa o formulário
      setDescricao("");
      setCustoTotal("");
      setSelectedItems(new Set());
      onDataChanged(); // Força o refresh de todo o App

    } catch (error) {
      const errorMsg = error.response?.data?.erro || "Erro ao alocar custo.";
      alert(errorMsg);
    }
  };

  return (
    <div className="cost-allocator">
      <h2>Rateador de Custos Logísticos (Gasolina, etc.)</h2>
      <p>Use esta ferramenta *depois* de adicionar os itens ao estoque. Ela debitará o valor do seu caixa e o distribuirá pelos itens selecionados.</p>

      <form onSubmit={handleSubmit} className="allocator-form">
        <div className="input-group">
          <label>Descrição do Custo</label>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Gasolina Viagem SP"
            required
          />
        </div>
        <div className="input-group">
          <label>Valor Total (R$)</label>
          <input
            type="number"
            step="0.01"
            value={custoTotal}
            onChange={(e) => setCustoTotal(e.target.value)}
            placeholder="Ex: 50.00"
            required
          />
        </div>
        <div className="input-group">
          <label>Método de Rateio</label>
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            <option value="Peso">Por Peso (kg)</option>
            <option value="Valor">Por Valor (R$)</option>
          </select>
        </div>
        <button type="submit">Alocar Custo</button>
      </form>

      <label><strong>Selecione os Itens para Rateio:</strong></label>
      <div className="allocator-item-list">
        {stockItems.length === 0 && <p>Nenhum item em estoque para selecionar.</p>}
        {stockItems.map(item => (
          <label key={item.id}>
            <input
              type="checkbox"
              checked={selectedItems.has(item.id)}
              onChange={() => handleSelect(item.id)}
            />
            {item.nome_produto} (ID: {item.id} | Peso: {item.peso_kg}kg | Valor: R$ {item.custo_produto_brl.toFixed(2)})
          </label>
        ))}
      </div>
    </div>
  );
}

export default CostAllocator;