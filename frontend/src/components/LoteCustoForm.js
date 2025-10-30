// frontend/src/components/LoteCustoForm.js
import React, { useState, useEffect } from "react";

// 1. O formulário agora pode receber um 'loteToEdit'
function LoteCustoForm({ api, onDataChanged, loteToEdit, onDoneEditing }) {
  const [descricao, setDescricao] = useState("");
  const [custoTotal, setCustoTotal] = useState("");
  const [metodo, setMetodo] = useState("Peso");

  const [stockItems, setStockItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());

  const [isEditing, setIsEditing] = useState(false);

  // 2. Carrega o estado de edição se um lote for passado
  useEffect(() => {
    if (loteToEdit) {
      setIsEditing(true);
      setDescricao(loteToEdit.descricao);
      setCustoTotal(loteToEdit.valor_total_brl);
      setMetodo(loteToEdit.metodo_rateio);
      setSelectedItems(new Set(loteToEdit.item_ids));
    } else {
      setIsEditing(false);
      resetForm();
    }
  }, [loteToEdit]);

  // Carrega os itens do estoque para seleção
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

  const handleSelect = (itemId) => {
    setSelectedItems(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(itemId)) newSelected.delete(itemId);
      else newSelected.add(itemId);
      return newSelected;
    });
  };

  const resetForm = () => {
    setDescricao("");
    setCustoTotal("");
    setMetodo("Peso");
    setSelectedItems(new Set());
    if(onDoneEditing) onDoneEditing(); // Fecha o modal
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.size === 0) {
      alert("Por favor, selecione pelo menos um item para alocar o custo.");
      return;
    }

    const dataToSend = {
      descricao: descricao,
      valor_total_brl: parseFloat(custoTotal),
      metodo_rateio: metodo,
      item_ids: Array.from(selectedItems)
    };

    try {
      if (isEditing) {
        // 3. Rota de Edição (PUT)
        await api.put(`/lotes-de-custo/${loteToEdit.id}`, dataToSend);
        alert('Lote de custo atualizado com sucesso!');
      } else {
        // 4. Rota de Criação (POST)
        await api.post('/lotes-de-custo', dataToSend);
        alert('Lote de custo criado! Uma nova "Conta a Pagar" foi gerada.');
      }

      resetForm();
      onDataChanged();

    } catch (error) {
      const errorMsg = error.response?.data?.erro || "Erro ao salvar lote de custo.";
      alert(errorMsg);
    }
  };

  // Se for usado como modal, não mostra o título principal
  const Title = isEditing ? "Editar Lote de Custo" : "Criar Lote de Custo (Gasolina, etc.)";

  return (
    <div className={!isEditing ? "cost-allocator" : ""}>
      <h2>{Title}</h2>
      {!isEditing && (
        <p>Use esta ferramenta para criar um custo (ex: Gasolina) e alocá-lo a itens do estoque. Isso criará uma "Conta a Pagar" para o valor total.</p>
      )}

      <form onSubmit={handleSubmit} className="allocator-form">
        <div className="input-group">
          <label>Descrição do Custo</label>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Gasolina Viagem SP" required />
        </div>
        <div className="input-group">
          <label>Valor Total (R$)</label>
          <input type="number" step="0.01" value={custoTotal} onChange={(e) => setCustoTotal(e.target.value)} placeholder="Ex: 50.00" required />
        </div>
        <div className="input-group">
          <label>Método de Rateio</label>
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            <option value="Peso">Por Peso (kg)</option>
            <option value="Valor">Por Valor (R$)</option>
          </select>
        </div>
        <button type="submit">{isEditing ? "Salvar Alterações" : "Criar Lote"}</button>
        {isEditing && <button type="button" onClick={resetForm}>Cancelar Edição</button>}
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

export default LoteCustoForm;