// frontend/src/components/SalesHistory.js
import React, { useEffect, useState } from "react";
// --- NOVO ---
// Vamos precisar deste modal, que criaremos a seguir
import EditarVendaModal from "./EditarVendaModal";

function SalesHistory({ api }) {
  const [vendas, setVendas] = useState([]);

  // --- NOVO ---
  // Estado para controlar qual venda estamos editando
  const [vendaParaEditar, setVendaParaEditar] = useState(null);

  // --- MUDANÇA ---
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
    return new Date(isoString).toLocaleString('pt-BR');
  };

  // --- NOVA FUNÇÃO: REVERTER ---
  const handleReverter = async (vendaId) => {
    if (!window.confirm("Tem certeza que deseja reverter esta venda? O item voltará ao estoque.")) {
      return;
    }
    try {
      await api.post(`/venda/${vendaId}/reverter`);
      alert('Venda revertida com sucesso!');
      fetchVendas(); // Recarrega a lista de vendas
      // Você também precisará recarregar a lista de ESTOQUE em outro lugar
    } catch (error) {
      alert('Erro ao reverter venda: ' + (error.response?.data?.erro || error.message));
    }
  };

  // --- NOVAS FUNÇÕES: EDITAR (Modal) ---
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
            <th>Ações</th> {/* <-- Nova Coluna */}
          </tr>
        </thead>
        <tbody>
          {vendas.map((venda) => (
            <tr key={venda.id_venda}>
              <td>{venda.nome_produto} (ID: {venda.item_id})</td>
              <td>{formatarData(venda.data_venda)}</td>
              <td>R$ {venda.custo_total_brl.toFixed(2)}</td>
              <td>R$ {venda.preco_venda_final_brl.toFixed(2)}</td>
              <td style={{ color: venda.lucro_real_brl < 0 ? 'red' : 'green' }}>
                R$ {venda.lucro_real_brl.toFixed(2)}
              </td>
              {/* <-- Novos Botões --> */}
              <td>
                <button
                  className="btn-editar" // Adicione classes CSS se quiser
                  onClick={() => handleAbrirModalEditar(venda)}
                >
                  Editar
                </button>
                <button
                  className="btn-reverter" // Adicione classes CSS se quiser
                  onClick={() => handleReverter(venda.id_venda)}
                >
                  Reverter
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- NOVO: Renderização do Modal --- */}
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