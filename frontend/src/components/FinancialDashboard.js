// frontend/src/components/FinancialDashboard.js
import React, { useEffect, useState } from "react";

function FinancialDashboard({ api }) {
  const [balanco, setBalanco] = useState({
    total_receitas_brl: 0,
    total_custos_brl: 0,
    balanco_total_brl: 0,
    total_a_pagar_brl: 0,
    total_a_receber_brl: 0,
    total_estoque_valor_venda_brl: 0, // 1. Novo estado
    patrimonio_total_projetado_brl: 0 // 2. Novo estado
  });

  useEffect(() => {
    const loadBalanco = async () => {
      try {
        const response = await api.get("/financeiro/balanco");
        setBalanco(response.data);
      } catch (error) {
        console.error("Erro ao carregar balanço financeiro:", error);
      }
    };
    loadBalanco();
  }, []);

  const formatBRL = (value) => {
    return `R$ ${value.toFixed(2)}`;
  };

  return (
    <div className="financial-dashboard">
      <h2>Balanço Financeiro</h2>
      <div className="dashboard-metrics">
        <div className="metric-item">
          <h3>Balanço (Caixa Atual)</h3>
          <p className="balanco">{formatBRL(balanco.balanco_total_brl)}</p>
        </div>
        <div className="metric-item">
          <h3>A Receber (Pendente)</h3>
          <p className="areceber">{formatBRL(balanco.total_a_receber_brl)}</p>
        </div>
        <div className="metric-item">
          <h3>A Pagar (Pendente)</h3>
          <p className="apagar">{formatBRL(balanco.total_a_pagar_brl)}</p>
        </div>

        {/* --- 3. NOVOS CARDS --- */}
        <div className="metric-item">
          <h3>Valor do Estoque (Venda)</h3>
          <p>{formatBRL(balanco.total_estoque_valor_venda_brl)}</p>
        </div>
        <div className="metric-item">
          <h3>Patrimônio Total (Projetado)</h3>
          <p className="patrimonio">{formatBRL(balanco.patrimonio_total_projetado_brl)}</p>
        </div>

        {/* --- Totais movidos para menor destaque --- */}
        <div className="metric-item">
          <small>Receita Total (Paga)</small>
          <p className="receita" style={{fontSize: "1.2em"}}>{formatBRL(balanco.total_receitas_brl)}</p>
        </div>
        <div className="metric-item">
          <small>Custo Total (Pago)</small>
          <p className="custo" style={{fontSize: "1.2em"}}>{formatBRL(balanco.total_custos_brl)}</p>
        </div>
      </div>
    </div>
  );
}

export default FinancialDashboard;