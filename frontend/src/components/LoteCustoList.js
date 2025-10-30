// frontend/src/components/LoteCustoList.js
import React, { useEffect, useState } from "react";
import Modal from 'react-modal';
import LoteCustoForm from "./LoteCustoForm"; // Reutiliza o formulário

function LoteCustoList({ api, onDataChanged }) {
  const [lotes, setLotes] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentLote, setCurrentLote] = useState(null);

  const loadLotes = async () => {
    try {
      const response = await api.get("/lotes-de-custo");
      setLotes(response.data);
    } catch (error) {
      console.error("Erro ao carregar lotes de custo:", error);
    }
  };

  useEffect(() => {
    loadLotes();
  }, []);

  const openModal = (lote) => {
    setCurrentLote(lote);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setCurrentLote(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este lote de custo? Isso também excluirá a 'Conta a Pagar' associada e recalculará o custo dos itens.")) {
      return;
    }
    try {
      await api.delete(`/lotes-de-custo/${id}`);
      onDataChanged(); // Atualiza tudo
    } catch (error) {
      alert(error.response?.data?.erro || 'Erro ao excluir lote.');
    }
  };

  return (
    <div className="contas-a-pagar">
      <h2>Lotes de Custo Registrados (Rateios)</h2>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Valor Total (R$)</th>
            <th>Método</th>
            <th>Itens Alocados</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {lotes.length === 0 && ( <tr><td colSpan="5">Nenhum lote de custo registrado.</td></tr> )}
          {lotes.map((lote) => (
            <tr key={lote.id}>
              <td>{lote.descricao} (Conta ID: {lote.conta_a_pagar_id})</td>
              <td>R$ {lote.valor_total_brl.toFixed(2)}</td>
              <td>{lote.metodo_rateio}</td>
              <td>{lote.item_ids.length}</td>
              <td className="action-buttons">
                <button onClick={() => openModal(lote)}>Editar</button>
                <button className="btn-danger" onClick={() => handleDelete(lote.id)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- Modal de Edição (reutiliza o formulário) --- */}
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal} className="modal-content" overlayClassName="modal-overlay">
        <button className="modal-close-button" onClick={closeModal}>&times;</button>
        {currentLote && (
          <LoteCustoForm
            api={api}
            onDataChanged={onDataChanged}
            loteToEdit={currentLote}
            onDoneEditing={closeModal}
          />
        )}
      </Modal>
    </div>
  );
}

export default LoteCustoList;