// frontend/src/components/StockItemList.js
import React, { useEffect, useState } from "react";
import Modal from 'react-modal';
import { Fragment } from 'react';

const SHIPPING_RATES = { 'Air': 22.5, 'Sea': 12.0 };

function StockItemList({ api, onDataChanged }) {
  const [stockItems, setStockItems] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('edit'); // 'edit', 'delete', ou 'sell'
  const [currentItem, setCurrentItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [openRowId, setOpenRowId] = useState(null);

  // 1. Novo estado para o modal de Venda
  const [vendaFinalPrice, setVendaFinalPrice] = useState("");

  const loadItems = async () => {
    try {
      const response = await api.get("/estoque");
      setStockItems(response.data);
    } catch (error) {
      console.error("Erro ao carregar estoque:", error);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // 2. Atualizar 'openModal' para lidar com 'sell'
  const openModal = (mode, item) => {
    setCurrentItem(item);
    setModalMode(mode);
    if (mode === 'edit') {
      setEditFormData({
        preco_compra_usd: item.preco_compra_usd,
        peso_kg: item.peso_kg,
        iof_percent: item.iof_percent,
        taxa_dolar: item.taxa_dolar,
        shipping_method: item.shipping_method,
      });
    }
    if (mode === 'sell') {
      // Preenche o preço de venda com o valor estimado
      setVendaFinalPrice(item.preco_venda_estimado_brl.toFixed(2));
    }
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setCurrentItem(null);
    setEditFormData({});
    setVendaFinalPrice(""); // Limpa o preço de venda
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentItem) return;
    try {
      await api.put(`/estoque/${currentItem.id}`, editFormData);
      closeModal();
      onDataChanged();
    } catch (error) {
      alert("Erro ao atualizar item.");
    }
  };

  const handleDelete = async () => {
    if (!currentItem) return;
    try {
      await api.delete(`/estoque/${currentItem.id}`);
      closeModal();
      onDataChanged();
    } catch (error) {
      alert("Erro ao deletar item.");
    }
  };

  // 3. Nova função para confirmar a Venda
  const handleSellSubmit = async (e) => {
    e.preventDefault();
    if (!currentItem) return;
    try {
      await api.post(`/estoque/${currentItem.id}/vender`, {
        preco_venda_final_brl: parseFloat(vendaFinalPrice)
      });
      closeModal();
      onDataChanged(); // Recarrega o App (atualiza Estoque e Histórico)
    } catch (error) {
      const errorMsg = error.response?.data?.erro || "Erro ao registrar venda.";
      alert(errorMsg);
    }
  };


  const formatarData = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString('pt-BR');
  };

  const handleRowClick = (itemId) => {
    setOpenRowId(prevId => (prevId === itemId ? null : itemId));
  };

  const calcularValores = (p) => {
    return {
      custoProdutoBRL: p.custo_produto_brl,
      custoIofBRL: p.custo_iof_brl,
      custoFreteBRL: p.custo_frete_brl,
      iofPercent: p.iof_percent,
      taxaDolar: p.taxa_dolar.toFixed(2),

      peso: p.peso_kg,
      shipping_method: p.shipping_method,

      // Correção do erro .get() para []
      shipping_rate: SHIPPING_RATES[p.shipping_method] || SHIPPING_RATES['Air'],

      custoTotalBRL: p.custo_total_brl.toFixed(2),
      lucroBRL: p.lucro_estimado_brl.toFixed(2),
      lucroPercent: p.lucro_estimado_percent.toFixed(2),
    };
  };

  // 4. Atualizar o JSX (Botão Vender)
  return (
    <div>
      <h2>Itens em Estoque</h2>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Data Compra</th>
            <th>Custo Total (BRL)</th>
            <th>Venda Estimada (BRL)</th>
            <th>Lucro Estimado (BRL)</th>
            <th>Lucro (%)</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {stockItems.map((item) => {
            const isRowOpen = openRowId === item.id;
            return (
              <Fragment key={item.id}>
                <tr className="product-row" onClick={() => handleRowClick(item.id)}>
                  <td>{item.nome_produto} {isRowOpen ? '▲' : '▼'}</td>
                  <td>{formatarData(item.data_cadastro)}</td>
                  <td>R$ {item.custo_total_brl.toFixed(2)}</td>
                  <td>R$ {item.preco_venda_estimado_brl.toFixed(2)}</td>
                  <td style={{color: item.lucro_estimado_brl < 0 ? 'red' : 'green'}}>
                    R$ {item.lucro_estimado_brl.toFixed(2)}
                  </td>
                  <td style={{color: item.lucro_estimado_percent < 0 ? 'red' : 'green'}}>
                    {item.lucro_estimado_percent.toFixed(2)}%
                  </td>
                  <td className="action-buttons">
                    {/* --- 5. NOVO BOTÃO DE VENDER --- */}
                    <button className="btn-success" onClick={(e) => { e.stopPropagation(); openModal('sell', item); }}>Vender</button>
                    <button onClick={(e) => { e.stopPropagation(); openModal('edit', item); }}>Editar</button>
                    <button className="btn-danger" onClick={(e) => { e.stopPropagation(); openModal('delete', item); }}>Excluir</button>
                  </td>
                </tr>

                {/* ... (Linha de Detalhamento - Sem mudanças) ... */}
                {isRowOpen && (
                  <tr className="breakdown-row">
                    <td colSpan="7">
                      <div className="breakdown-content">
                         {/* ... (conteúdo do breakdown igual ao anterior) ... */}
                        <h4>Detalhamento de Custo (R$) para: {item.nome_produto} (ID: {item.id})</h4>
                        {(() => {
                          const valores = calcularValores(item);
                          return (
                            <ul>
                              <li>
                                <strong>Produto:</strong> R$ {valores.custoProdutoBRL.toFixed(2)}
                                <span>(${item.preco_compra_usd.toFixed(2)} USD * Cotação R$ {valores.taxaDolar})</span>
                              </li>
                              <li>
                                <strong>IOF:</strong> R$ {valores.custoIofBRL.toFixed(2)}
                                <span>({valores.iofPercent}% sobre o valor do produto)</span>
                              </li>
                              <li>
                                <strong>Frete ({valores.shipping_method}):</strong> R$ {valores.custoFreteBRL.toFixed(2)}
                                <span>
                                  ({valores.peso} kg * ${valores.shipping_rate.toFixed(2)}/kg * Cotação R$ {valores.taxaDolar})
                                </span>
                              </li>
                            </ul>
                          );
                        })()}
                        <p className="breakdown-total">
                          Custo Total (BRL): R$ {item.custo_total_brl.toFixed(2)}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {/* --- 6. ATUALIZAR O MODAL (Adicionar o 'sell') --- */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        className="modal-content"
        overlayClassName="modal-overlay"
        contentLabel="Ações do Item"
      >
        <button className="modal-close-button" onClick={closeModal}>&times;</button>

        {/* Modal de Edição (sem mudanças) */}
        {modalMode === 'edit' && currentItem && (
          <div>
            {/* ... (formulário de edição igual ao anterior) ... */}
          </div>
        )}

        {/* Modal de Exclusão (sem mudanças) */}
        {modalMode === 'delete' && currentItem && (
          <div>
            {/* ... (confirmação de exclusão igual ao anterior) ... */}
          </div>
        )}

        {/* --- 7. NOVO MODAL DE VENDA --- */}
        {modalMode === 'sell' && currentItem && (
          <div>
            <h2>Registrar Venda do Item</h2>
            <p><strong>Produto:</strong> {currentItem.nome_produto} (ID: {currentItem.id})</p>
            <p><strong>Custo Total (BRL):</strong> R$ {currentItem.custo_total_brl.toFixed(2)}</p>
            <p><strong>Venda Estimada (BRL):</strong> R$ {currentItem.preco_venda_estimado_brl.toFixed(2)}</p>

            <form onSubmit={handleSellSubmit}>
              <div className="input-group">
                <label htmlFor="sell_price">Preço de Venda Final (BRL)</label>
                <input
                  id="sell_price"
                  name="preco_venda_final_brl"
                  type="number"
                  step="0.01"
                  value={vendaFinalPrice}
                  onChange={(e) => setVendaFinalPrice(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn-success">Confirmar Venda</button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default StockItemList;