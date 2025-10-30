// frontend/src/components/ContasAReceber.js
import React, { useEffect, useState } from "react";

function ContasAReceber({ api, onDataChanged }) {
  const [contas, setContas] = useState([]);

  useEffect(() => {
    const loadContas = async () => {
      try {
        // Busca apenas as contas com status 'Pendente'
        const response = await api.get("/contas-a-receber?status=Pendente");
        setContas(response.data);
      } catch (error) {
        console.error("Erro ao carregar contas a receber:", error);
      }
    };

    loadContas();
  }, []);

  const handleReceberConta = async (id) => {
    if (!window.confirm("Confirmar o recebimento desta parcela? Esta ação adicionará o valor ao seu caixa.")) {
      return;
    }

    try {
      await api.post(`/contas-a-receber/${id}/receber`);
      alert('Parcela recebida com sucesso!');
      onDataChanged(); // Força o refresh de todo o App
    } catch (error) {
      alert('Erro ao receber parcela.');
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
    <div className="contas-a-receber">
      <h2>Contas a Receber (Pendentes)</h2>
      <table>
        <thead>
          <tr>
            <th>Produto Vendido</th>
            <th>Vencimento</th>
            <th>Valor da Parcela (R$)</th>
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
              <td>{conta.nome_produto} (Venda ID: {conta.venda_id})</td>
              <td>{formatarData(conta.data_vencimento)}</td>
              <td>R$ {conta.valor_parcela_brl.toFixed(2)}</td>
              <td>
                <button
                  className="btn-receber"
                  onClick={() => handleReceberConta(conta.id)}
                >
                  Dar Baixa (Receber)
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ContasAReceber;