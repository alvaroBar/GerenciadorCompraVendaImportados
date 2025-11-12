// frontend/src/components/SalesHistory.js
import React, { useEffect, useState } from "react";
// Importa o modal que já criamos
import EditarVendaModal from "./EditarVendaModal";

function SalesHistory({ api }) {
  const [vendas, setVendas] = useState([]);

  // Estado para controlar qual venda estamos editando
  const [vendaParaEditar, setVendaParaEditar] = useState(null);

  // Extraímos a lógica de carregamento para uma função
  // assim podemos "recarregar" a lista após uma ação.
  const fetchVendas = async () => {
    try {
      const response = await api.get("/vendas");
      setVendas(response.data);
    } catch (error) {
      console.error("Erro ao carregar histórico de vendas:", error);
    }
  };

  useEffect(() => {
    fetchVendas(); // Carrega os dados
  }, [api]); // Adicionamos 'api' como dependência

  const formatarData = (isoString) => {
    if (!isoString) return 'N/A';
    // --- MUDANÇA --- (Usando toLocaleString que você tinha antes)
    return new Date(isoString).toLocaleString('pt-BR');
  };

  // --- FUNÇÃO: REVERTER ---
  const handleReverter = async (vendaId) => {
    if (!window.confirm("Tem certeza que deseja reverter esta venda? O item voltará ao estoque.")) {
      return;
    }
    try {
      await api.post(`/venda/${vendaId}/reverter`);
      alert('Venda revertida com sucesso!');
      fetchVendas(); // Recarrega a lista de vendas
      // NOTA: Você precisará de um 'onDataChanged' (como no StockItemList)
      // para forçar a atualização da lista de estoque.
    } catch (error) {
      alert('Erro ao reverter venda: ' + (error.response?.data?.erro || error.message));
    }
  };

  // --- FUNÇÕES: EDITAR (Modal) ---
  const handleAbrirModalEditar = (venda) => {
    setVendaParaEditar(venda);
  };

  const handleFecharModal = () => {
    setVendaParaEditar(null);
  };

  const handleSalvarEdicao = async (dadosEditados) => {
    try {
      await api.put(`/venda/${vendaParaEditar.id_venda}`, dadosEditados);
      alert('Venda atualizada com sucesso!');
      fetchVendas(); // Recarrega a lista
      handleFecharModal(); // Fecha o modal
    } catch (error) {
      alert('Erro ao atualizar venda: ' + (error.response?.data?.erro || error.message));
    }
  };

  return (
    <div className="sales-history">
      <h2>Histórico de Vendas</h2>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Data da Venda</th>
            <th>Custo (BRL)</th>
            <th>Venda (BRL)</th>
            <th>Lucro Real (BRL)</th>
            {/* --- NOVO: Cabeçalho da coluna --- */}
            <th>Lucro (%)</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {vendas.map((venda) => {

            // --- NOVO: Lógica de cálculo movida para cá ---
            const custo = parseFloat(venda.custo_total_brl);
            const lucro = parseFloat(venda.lucro_real_brl);
            // Evita divisão por zero
            const lucroPercent = (custo > 0) ? (lucro / custo) * 100 : 0;
            const corLucro = lucro < 0 ? 'red' : 'green';
            // --- FIM DA LÓGICA ---

            return (
              <tr key={venda.id_venda}>
                <td>{venda.nome_produto} (ID: {venda.item_id})</td>
                <td>{formatarData(venda.data_venda)}</td>
                {/* --- MUDANÇA: Usando as variáveis calculadas --- */}
                <td>R$ {custo.toFixed(2)}</td>
                <td>R$ {venda.preco_venda_final_brl.toFixed(2)}</td>
                <td style={{ color: corLucro }}>
                  R$ {lucro.toFixed(2)}
                </td>

                {/* --- NOVO: Célula da porcentagem --- */}
                <td style={{ color: corLucro }}>
                  {lucroPercent.toFixed(2)}%
                </td>

                <td className="action-buttons">
                  <button
                    className="btn-editar"
                    onClick={() => handleAbrirModalEditar(venda)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn-reverter"
                    onClick={() => handleReverter(venda.id_venda)}
                  >
                    Reverter
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* --- Renderização do Modal --- */}
      {vendaParaEditar && (
        <EditarVendaModal
          venda={vendaParaEditar}
          onClose={handleFecharModal}
          onSave={handleSalvarEdicao}
        />
      )}
    </div>
  );
}

export default SalesHistory;