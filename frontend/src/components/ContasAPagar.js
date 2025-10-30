// frontend/src/components/ContasAPagar.js
import React, { useEffect, useState } from "react";
import Modal from 'react-modal';

function ContasAPagar({ api, onDataChanged }) {
  const [contas, setContas] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  // Carrega apenas as contas pendentes
  const loadContas = async () => {
    try {
      const response = await api.get("/contas-a-pagar?status=Pendente");
      setContas(response.data);
    } catch (error) {
      console.error("Erro ao carregar contas a pagar:", error);
    }
  };

  useEffect(() => {
    loadContas();
  }, []);

  const openModal = (item) => {
    setCurrentItem(item);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setCurrentItem(null);
  };

  const handleChange = (e) => {
    setCurrentItem({ ...currentItem, [e.target.name]: e.target.value });
  };

  // Ação de Pagar
  const handlePagarConta = async (id) => {
    if (!window.confirm("Confirmar o pagamento desta conta? Esta ação debitará o valor do seu caixa.")) {
      return;
    }
    try {
      await api.post(`/contas-a-pagar/${id}/pagar`);
      alert('Conta paga com sucesso!');
      onDataChanged();
    } catch (error) {
      alert('Erro ao pagar conta.');
    }
  };

  // Ação de Editar
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/contas-a-pagar/${currentItem.id}`, currentItem);
      closeModal();
      onDataChanged();
    } catch (error) {
      alert('Erro ao atualizar conta.');
    }
  };

  // Ação de Excluir
  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta conta pendente?")) {
      return;
    }
    try {
      await api.delete(`/contas-a-pagar/${id}`);
      onDataChanged();
    } catch (error) {
      alert('Erro ao excluir conta.');
    }
  };

  const formatarData = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="contas-a-pagar">
      <h2>Contas a Pagar (Pendentes)</h2>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Vencimento</th>
            <th>Valor (R$)</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {contas.length === 0 && ( <tr><td colSpan="4">Nenhuma conta pendente.</td></tr> )}
          {contas.map((conta) => (
            <tr key={conta.id}>
              <td>{conta.descricao}</td>
              <td>{formatarData(conta.data_vencimento)}</td>
              <td>R$ {conta.valor_brl.toFixed(2)}</td>
              <td className="action-buttons">
                <button className="btn-pagar" onClick={() => handlePagarConta(conta.id)}>Pagar</button>
                <button onClick={() => openModal(conta)}>Editar</button>
                <button className="btn-danger" onClick={() => handleDelete(conta.id)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- Modal de Edição --- */}
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal} className="modal-content" overlayClassName="modal-overlay">
        <button className="modal-close-button" onClick={closeModal}>&times;</button>
        {currentItem && (
          <div>
            <h2>Editar Conta a Pagar</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="input-group">
                <label>Descrição</label>
                <input name="descricao" value={currentItem.descricao} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label>Valor (R$)</label>
                <input name="valor_brl" type="number" step="0.01" value={currentItem.valor_brl} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label>Data de Vencimento</label>
                <input name="data_vencimento" type="date" value={currentItem.data_vencimento} onChange={handleChange} required />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeModal}>Cancelar</button>
                <button type="submit">Salvar Alterações</button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ContasAPagar;