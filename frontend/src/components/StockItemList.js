// frontend/src/components/StockItemList.js
import React, { useEffect, useState } from "react";
import Modal from 'react-modal';
import { Fragment } from 'react';

const SHIPPING_RATES = { 'Air': 22.5, 'Sea': 12.0 };

function StockItemList({ api, onDataChanged }) {
  const [stockItems, setStockItems] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('edit');
  const [currentItem, setCurrentItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [openRowId, setOpenRowId] = useState(null);
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

  const openModal = (mode, item) => {
    setCurrentItem(item);
    setModalMode(mode);
    if (mode === 'edit') {
      setEditFormData({
        // 1. ADICIONAR PREÇO DE VENDA AO FORM DE EDIÇÃO
        preco_venda_estimado_brl: item.preco_venda_estimado_brl,

        preco_compra_usd: item.preco_compra_usd,
        peso_kg: item.peso_kg,
        iof_percent: item.iof_percent,
        taxa_dolar: item.taxa_dolar,
        shipping_method: item.shipping_method,
        custo_adicional_brl: item.custo_adicional_brl
      });
    }
    if (mode === 'sell') {
      setVendaFinalPrice(item.preco_venda_estimado_brl.toFixed(2));
    }
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setCurrentItem(null);
    setEditFormData({});
    setVendaFinalPrice("");
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentItem) return;
    try {
      // 2. Os dados de venda agora são enviados junto
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

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    if (!currentItem) return;
    try {
      await api.post(`/estoque/${currentItem.id}/vender`, {
        preco_venda_final_brl: parseFloat(vendaFinalPrice)
      });
      closeModal();
      onDataChanged();
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
      custoAdicionalBRL: p.custo_adicional_brl,
      iofPercent: p.iof_percent,
      taxaDolar: p.taxa_dolar.toFixed(2),
      peso: p.peso_kg,
      shipping_method: p.shipping_method,
      shipping_rate: SHIPPING_RATES[p.shipping_method] || SHIPPING_RATES['Air'],
    };
  };

  // --- Renderização ---
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
                  {/* Esta linha agora exibirá o valor correto */}
                  <td>R$ {item.preco_venda_estimado_brl.toFixed(2)}</td>
                  <td style={{color: item.lucro_estimado_brl < 0 ? 'red' : 'green'}}>
                    R$ {item.lucro_estimado_brl.toFixed(2)}
                  </td>
                  <td style={{color: item.lucro_estimado_percent < 0 ? 'red' : 'green'}}>
                    {item.lucro_estimado_percent.toFixed(2)}%
                  </td>
                  <td className="action-buttons">
                    <button className="btn-success" onClick={(e) => { e.stopPropagation(); openModal('sell', item); }}>Vender</button>
                    <button onClick={(e) => { e.stopPropagation(); openModal('edit', item); }}>Editar</button>
                    <button className="btn-danger" onClick={(e) => { e.stopPropagation(); openModal('delete', item); }}>Excluir</button>
                  </td>
                </tr>

                {isRowOpen && (
                  <tr className="breakdown-row">
                    <td colSpan="7">
                      <div className="breakdown-content">
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
                              {valores.custoAdicionalBRL > 0 && (
                                <li style={{color: '#b26500'}}>
                                  <strong>Custo Adicional (Rateado):</strong> R$ {valores.custoAdicionalBRL.toFixed(2)}
                                </li>
                              )}
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

      {/* --- Modal --- */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        className="modal-content"
        overlayClassName="modal-overlay"
        contentLabel="Ações do Item"
      >
        <button className="modal-close-button" onClick={closeModal}>&times;</button>

        {/* 3. ATUALIZAR O MODAL DE EDIÇÃO */}
        {modalMode === 'edit' && currentItem && (
          <div>
            <h2>Editar Dados (Item: {currentItem.nome_produto})</h2>
            <form key={currentItem.id} onSubmit={handleEditSubmit}>

              {/* --- 4. NOVO CAMPO DE PREÇO DE VENDA --- */}
              <div className="input-group">
                <label htmlFor="edit_preco_venda">Preço Venda Estimada (BRL)</label>
                <input id="edit_preco_venda" name="preco_venda_estimado_brl" type="number" step="0.01" value={editFormData.preco_venda_estimado_brl} onChange={handleEditChange} required />
              </div>

              <div className="input-group">
                <label htmlFor="edit_preco_compra">Preço Compra (USD)</label>
                <input id="edit_preco_compra" name="preco_compra_usd" type="number" step="0.01" value={editFormData.preco_compra_usd} onChange={handleEditChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="edit_peso">Peso (kg)</label>
                <input id="edit_peso" name="peso_kg" type="number" step="0.01" value={editFormData.peso_kg} onChange={handleEditChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="edit_iof">IOF (%)</label>
                <input id="edit_iof" name="iof_percent" type="number" step="0.01" value={editFormData.iof_percent} onChange={handleEditChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="edit_dolar">Cotação Dólar (R$)</label>
                <input id="edit_dolar" name="taxa_dolar" type="number" step="0.01" value={editFormData.taxa_dolar} onChange={handleEditChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="edit_shipping">Método de Envio</label>
                <select id="edit_shipping" name="shipping_method" value={editFormData.shipping_method} onChange={handleEditChange}>
                  <option value="Air">Aéreo ($22.50/kg)</option>
                  <option value="Sea">Marítimo ($12.00/kg)</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="edit_custo_adicional">Custo Adicional (R$)</label>
                <input id="edit_custo_adicional" name="custo_adicional_brl" type="number" step="0.01" value={editFormData.custo_adicional_brl} onChange={handleEditChange} required />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeModal}>Cancelar</button>
                <button type="submit">Salvar Alterações</button>
              </div>
            </form>
          </div>
        )}

        {/* --- Modais 'Vender' e 'Deletar' (sem mudanças) --- */}
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
        {modalMode === 'delete' && currentItem && (
          <div>
            <h2>Confirmar Exclusão</h2>
            <p>Você tem certeza que deseja remover este item (<strong>{currentItem.nome_produto}</strong>, ID: {currentItem.id}) do estoque?</p>
            <div className="modal-actions">
              <button type="button" onClick={closeModal}>Cancelar</button>
              <button type="button" className="btn-danger" onClick={handleDelete}>Confirmar Exclusão</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default StockItemList;