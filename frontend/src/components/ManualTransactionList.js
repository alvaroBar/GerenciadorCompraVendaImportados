// frontend/src/components/ManualTransactionList.js
import React, { useEffect, useState } from "react";
import Modal from 'react-modal';

function ManualTransactionList({ api, onDataChanged }) {
  const [transacoes, setTransacoes] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  // Carrega apenas as transações manuais
  const loadTransacoes = async () => {
    try {
      const response = await api.get("/financeiro/transacoes-manuais");
      setTransacoes(response.data);
    } catch (error) {
      console.error("Erro ao carregar transações manuais:", error);
    }
  };

  useEffect(() => {
    loadTransacoes();
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

  // --- AQUI ESTÁ A CORREÇÃO ---
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/financeiro/transacao-manual/${currentItem.id}`, currentItem);
      closeModal();
      onDataChanged(); // Atualiza o balanço
    } catch (error) { // <-- Chave aberta
      alert('Erro ao atualizar transação.');
    } // <-- Chave fechada
  };

  // Ação de Excluir
  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta transação manual? Isso afetará seu balanço de caixa.")) {
      return;
    }
    try {
      await api.delete(`/financeiro/transacao-manual/${id}`);
      onDataChanged(); // Atualiza o balanço
    } catch (error) {
      alert('Erro ao excluir transação.');
    }
  };

  const formatarData = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    date.setDate(date.getDate() + 1); // Corrige fuso
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="manual-transactions">
      <h2>Transações Manuais (Caixa Inicial, Custos Avulsos)</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Valor (R$)</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {transacoes.length === 0 && ( <tr><td colSpan="5">Nenhuma transação manual registrada.</td></tr> )}
          {transacoes.map((item) => (
            <tr key={item.id}>
              <td>{formatarData(item.data)}</td>
              <td style={{color: item.tipo === 'Custo' ? 'red' : 'green'}}>{item.tipo}</td>
              <td>{item.descricao}</td>
              <td>R$ {item.valor_brl.toFixed(2)}</td>
              <td className="action-buttons">
                <button onClick={() => openModal(item)}>Editar</button>
                <button className="btn-danger" onClick={() => handleDelete(item.id)}>Excluir</button>
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
            <h2>Editar Transação Manual</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="input-group">
                <label>Tipo</label>
                <select name="tipo" value={currentItem.tipo} onChange={handleChange}>
                  <option value="Receita">Receita (Entrada)</option>
                  <option value="Custo">Custo (Saída)</option>
                </select>
              </div>
              <div className="input-group">
                <label>Descrição</label>
                <input name="descricao" value={currentItem.descricao} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label>Valor (R$)</label>
                <input name="valor_brl" type="number" step="0.01" value={currentItem.valor_brl} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label>Data da Transação</label>
                <input name="data" type="date" value={currentItem.data} onChange={handleChange} required />
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

export default ManualTransactionList;