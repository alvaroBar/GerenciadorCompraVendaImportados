// frontend/src/components/SalesHistory.js
import React, { useEffect, useState } from "react";

function SalesHistory({ api }) {
  const [vendas, setVendas] = useState([]);

  useEffect(() => {
    // Carrega o histórico de vendas
    const loadVendas = async () => {
      try {
        const response = await api.get("/vendas");
        setVendas(response.data);
      } catch (error) {
        console.error("Erro ao carregar histórico de vendas:", error);
      }
    };

    loadVendas();
  }, []); // Roda apenas uma vez

  const formatarData = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('pt-BR'); // Mostra data e hora
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
          </tr>
        </thead>
        <tbody>
          {vendas.map((venda) => (
            <tr key={venda.id_venda}>
              <td>{venda.nome_produto} (ID: {venda.item_id})</td>
              <td>{formatarData(venda.data_venda)}</td>
              <td>R$ {venda.custo_total_brl.toFixed(2)}</td>
              <td>R$ {venda.preco_venda_final_brl.toFixed(2)}</td>
              <td style={{color: venda.lucro_real_brl < 0 ? 'red' : 'green'}}>
                R$ {venda.lucro_real_brl.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SalesHistory;