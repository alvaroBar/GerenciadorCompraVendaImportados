// frontend/src/components/FinancialForms.js
import React, { useState } from "react";

function FinancialForms({ api, onDataChanged }) {

  // Estado para o formulário de Transação Manual
  const [manualForm, setManualForm] = useState({
    tipo: 'Receita',
    descricao: '',
    valor_brl: ''
  });

  // Estado para o formulário de Conta a Pagar
  const [contaForm, setContaForm] = useState({
    descricao: '',
    valor_brl: '',
    data_vencimento: ''
  });

  const handleManualChange = (e) => {
    setManualForm({ ...manualForm, [e.target.name]: e.target.value });
  };

  const handleContaChange = (e) => {
    setContaForm({ ...contaForm, [e.target.name]: e.target.value });
  };

  // Enviar Transação Manual (Caixa Inicial, Custo Avulso)
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/financeiro/transacao-manual', manualForm);
      alert('Transação manual registrada!');
      setManualForm({ tipo: 'Receita', descricao: '', valor_brl: '' });
      onDataChanged();
    } catch (error) {
      alert('Erro ao registrar transação.');
    }
  };

  // Enviar Nova Conta a Pagar
  const handleContaSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contas-a-pagar', contaForm);
      alert('Conta a pagar registrada!');
      setContaForm({ descricao: '', valor_brl: '', data_vencimento: '' });
      onDataChanged();
    } catch (error) {
      alert('Erro ao registrar conta.');
    }
  };

  return (
    <div className="financial-forms">
      {/* --- Formulário 1: Transação Manual --- */}
      <div>
        <h2>Transação Manual (Caixa)</h2>
        <form onSubmit={handleManualSubmit}>
          <p>Use para registrar seu <strong>Caixa Inicial</strong> (Receita) ou custos avulsos.</p>
          <div className="input-group">
            <label>Tipo</label>
            <select name="tipo" value={manualForm.tipo} onChange={handleManualChange}>
              <option value="Receita">Receita (Entrada)</option>
              <option value="Custo">Custo (Saída)</option>
            </select>
          </div>
          <div className="input-group">
            <label>Descrição</label>
            <input name="descricao" value={manualForm.descricao} onChange={handleManualChange} required />
          </div>
          <div className="input-group">
            <label>Valor (R$)</label>
            <input name="valor_brl" type="number" step="0.01" value={manualForm.valor_brl} onChange={handleManualChange} required />
          </div>
          <button type="submit">Registrar Transação</button>
        </form>
      </div>

      {/* --- Formulário 2: Contas a Pagar --- */}
      <div>
        <h2>Registrar Conta a Pagar</h2>
        <form onSubmit={handleContaSubmit}>
          <p>Registre custos futuros (ex: Aluguel, Luz, Gasolina).</p>
          <div className="input-group">
            <label>Descrição</label>
            <input name="descricao" value={contaForm.descricao} onChange={handleContaChange} required />
          </div>
          <div className="input-group">
            <label>Valor (R$)</label>
            <input name="valor_brl" type="number" step="0.01" value={contaForm.valor_brl} onChange={handleContaChange} required />
          </div>
          <div className="input-group">
            <label>Data de Vencimento</label>
            <input name="data_vencimento" type="date" value={contaForm.data_vencimento} onChange={handleContaChange} required />
          </div>
          <button type="submit">Registrar Conta</button>
        </form>
      </div>
    </div>
  );
}

export default FinancialForms;