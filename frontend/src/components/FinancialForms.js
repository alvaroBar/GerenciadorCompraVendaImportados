// frontend/src/components/FinancialForms.js
import React, { useState } from "react";

const getTodayDate = () => new Date().toISOString().split('T')[0];

function FinancialForms({ api, onDataChanged }) {

  // Form 1: Ajuste de Caixa (Transação Imediata)
  const [manualForm, setManualForm] = useState({
    tipo: 'Receita',
    descricao: '',
    valor_brl: '',
    data: getTodayDate()
  });

  // Form 2: Conta a Pagar (Custo Futuro)
  const [contaPagarForm, setContaPagarForm] = useState({
    descricao: '',
    valor_brl: '',
    data_vencimento: ''
  });

  // Form 3: Recebimento Futuro (Receita Futura)
  const [contaReceberForm, setContaReceberForm] = useState({
    descricao: '',
    valor_brl: '',
    data_vencimento: ''
  });

  // --- Handlers ---
  const handleManualChange = (e) => setManualForm({ ...manualForm, [e.target.name]: e.target.value });
  const handlePagarChange = (e) => setContaPagarForm({ ...contaPagarForm, [e.target.name]: e.target.value });
  const handleReceberChange = (e) => setContaReceberForm({ ...contaReceberForm, [e.target.name]: e.target.value });

  // --- Submits ---
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/financeiro/transacao-manual', manualForm);
      alert('Ajuste de caixa registrado!');
      setManualForm({ tipo: 'Receita', descricao: '', valor_brl: '', data: getTodayDate() });
      onDataChanged();
    } catch (error) {
      alert(error.response?.data?.erro || 'Erro ao registrar transação.');
    }
  };

  const handlePagarSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contas-a-pagar', contaPagarForm);
      alert('Conta a pagar registrada!');
      setContaPagarForm({ descricao: '', valor_brl: '', data_vencimento: '' });
      onDataChanged();
    } catch (error) {
      alert('Erro ao registrar conta.');
    }
  };

  const handleReceberSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Envia para a nova rota
      await api.post('/contas-a-receber-manual', contaReceberForm);
      alert('Recebimento futuro registrado!');
      setContaReceberForm({ descricao: '', valor_brl: '', data_vencimento: '' });
      onDataChanged();
    } catch (error) {
      alert('Erro ao registrar recebimento.');
    }
  };

  return (
    <div className="financial-forms">
      {/* --- Formulário 1: Ajuste de Caixa (Imediato) --- */}
      <div>
        <h2>Ajuste de Caixa (Imediato)</h2>
        <form onSubmit={handleManualSubmit}>
          <p>Use para <strong>Caixa Inicial</strong> ou transações que <strong>já aconteceram</strong>.</p>
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
          <div className="input-group">
            <label>Data da Transação</label>
            <input name="data" type="date" value={manualForm.data} onChange={handleManualChange} required />
          </div>
          <button type="submit">Ajustar Caixa</button>
        </form>
      </div>

      {/* --- Formulário 2: Registrar Conta a Pagar --- */}
      <div>
        <h2>Registrar Custo Futuro</h2>
        <form onSubmit={handlePagarSubmit}>
          <p>Registre custos futuros (Aluguel, Luz). Irá para "A Pagar".</p>
          <div className="input-group">
            <label>Descrição</label>
            <input name="descricao" value={contaPagarForm.descricao} onChange={handlePagarChange} required />
          </div>
          <div className="input-group">
            <label>Valor (R$)</label>
            <input name="valor_brl" type="number" step="0.01" value={contaPagarForm.valor_brl} onChange={handlePagarChange} required />
          </div>
          <div className="input-group">
            <label>Data de Vencimento</label>
            <input name="data_vencimento" type="date" value={contaPagarForm.data_vencimento} onChange={handlePagarChange} required />
          </div>
          <button type="submit">Agendar Custo</button>
        </form>
      </div>

      {/* --- 2. NOVO Formulário 3: Registrar Recebimento Futuro --- */}
      <div>
        <h2>Registrar Recebimento Futuro</h2>
        <form onSubmit={handleReceberSubmit}>
          <p>Registre receitas futuras (Salário, Venda antiga). Irá para "A Receber".</p>
          <div className="input-group">
            <label>Descrição</label>
            <input name="descricao" value={contaReceberForm.descricao} onChange={handleReceberChange} required placeholder="Ex: Saldo Salário" />
          </div>
          <div className="input-group">
            <label>Valor (R$)</label>
            <input name="valor_brl" type="number" step="0.01" value={contaReceberForm.valor_brl} onChange={handleReceberChange} required />
          </div>
          <div className="input-group">
            <label>Data de Recebimento</label>
            <input name="data_vencimento" type="date" value={contaReceberForm.data_vencimento} onChange={handleReceberChange} required />
          </div>
          <button type="submit">Agendar Recebimento</button>
        </form>
      </div>
    </div>
  );
}

export default FinancialForms;