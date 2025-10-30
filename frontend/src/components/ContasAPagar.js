// frontend/src/components/ContasAPagar.js
import React, { useEffect, useState } from "react";
import Modal from 'react-modal';

function ContasAPagar({ api, onDataChanged }) {
  const [contasPendentes, setContasPendentes] = useState([]);
  const [contasPagas, setContasPagas] = useState([]);

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  const loadContasPendentes = async () => {
    try {
      const response = await api.get("/contas-a-pagar?status=Pendente");
      setContasPendentes(response.data);
    } catch (error) {
      console.error("Erro ao carregar contas pendentes:", error);
    }
  };

  const loadContasPagas = async () => {
    try {
      const response = await api.get("/contas-a-pagar?status=Pago");
      setContasPagas(response.data);
    } catch (error) {
      console.error("Erro ao carregar contas pagas:", error);
    }
  };

  useEffect(() => {
    loadContasPendentes();
    loadContasPagas();
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

  // --- Ações ---

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

  const handleReverterPagamento = async (id) => {
    if (!window.confirm("Reverter este pagamento? O valor do custo será estornado do seu caixa e a conta voltará para 'Pendente'.")) {
      return;
    }
    try {
      await api.post(`/contas-a-pagar/${id}/reverter`);
      alert('Pagamento revertido com sucesso!');
      onDataChanged();
    } catch (error) {
      alert('Erro ao reverter pagamento.');
    }
  };

  const formatarData = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('pt-BR');
  };

  // --- 1. CÁLCULO DO TOTAL PENDENTE ---
  const totalPendente = contasPendentes.reduce(
    (acc, conta) => acc + (conta.valor_brl || 0),
    0
  );

  return (
    <div className="contas-a-pagar">

      {/* --- Tabela de Contas Pendentes --- */}
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
          {contasPendentes.length === 0 && ( <tr><td colSpan="4">Nenhuma conta pendente.</td></tr> )}
          {contasPendentes.map((conta) => (
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

        {/* --- 2. NOVO RODAPÉ COM O TOTAL --- */}
        <tfoot>
          <tr>
            <td colSpan="2" style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1em' }}>
              Total Pendente:
            </td>
            <td style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
              R$ {totalPendente.toFixed(2)}
            </td>
            <td></td> {/* Célula vazia para a coluna Ação */}
          </tr>
        </tfoot>

      </table>

      {/* --- Tabela de Contas Pagas (sem mudanças) --- */}
      <h2 style={{marginTop: '30px'}}>Contas Pagas (Histórico)</h2>
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
          {contasPagas.length === 0 && ( <tr><td colSpan="4">Nenhuma conta paga.</td></tr> )}
          {contasPagas.map((conta) => (
            <tr key={conta.id}>
              <td>{conta.descricao}</td>
              <td>{formatarData(conta.data_vencimento)}</td>
              <td>R$ {conta.valor_brl.toFixed(2)}</td>
              <td className="action-buttons">
                <button className="btn-reverter" onClick={() => handleReverterPagamento(conta.id)}>Reverter</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- Modal de Edição (sem mudanças) --- */}
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