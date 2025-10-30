// frontend/src/components/ContasAPagar.js
import React, { useEffect, useState } from "react";

function ContasAPagar({ api, onDataChanged }) {
  const [contas, setContas] = useState([]);

  useEffect(() => {
    const loadContas = async () => {
      try {
        // Busca apenas as contas com status 'Pendente'
        const response = await api.get("/contas-a-pagar?status=Pendente");
        setContas(response.data);
      } catch (error) {
        console.error("Erro ao carregar contas a pagar:", error);
      }
    };

    loadContas();
  }, []);

  const handlePagarConta = async (id) => {
    if (!window.confirm("Confirmar o pagamento desta conta? Esta ação debitará o valor do seu caixa.")) {
      return;
    }

    try {
      await api.post(`/contas-a-pagar/${id}/pagar`);
      alert('Conta paga com sucesso!');
      onDataChanged(); // Força o refresh de todo o App
    } catch (error) {
      alert('Erro ao pagar conta.');
    }
  };

  const formatarData = (isoString) => {
    if (!isoString) return 'N/A';
    // Adiciona 1 dia para corrigir fuso horário do input 'date'
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
          {contas.length === 0 && (
            <tr>
              <td colSpan="4">Nenhuma conta pendente.</td>
            </tr>
          )}
          {contas.map((conta) => (
            <tr key={conta.id}>
              <td>{conta.descricao}</td>
              <td>{formatarData(conta.data_vencimento)}</td>
              <td>R$ {conta.valor_brl.toFixed(2)}</td>
              <td>
                <button
                  className="btn-pagar"
                  onClick={() => handlePagarConta(conta.id)}
                >
                  Dar Baixa (Pagar)
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ContasAPagar;