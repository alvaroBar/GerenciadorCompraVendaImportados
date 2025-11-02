// frontend/src/components/StockItemList.js
import React, { useEffect, useState } from "react";
import Modal from 'react-modal';
import { Fragment } from 'react';

const SHIPPING_RATES = { 'Air': 22.5, 'Sea': 12.0 };
const getTodayDate = () => new Date().toISOString().split('T')[0];

function StockItemList({ api, onDataChanged }) {
  const [stockItems, setStockItems] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('edit');
  const [currentItem, setCurrentItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [openRowId, setOpenRowId] = useState(null);
  const [vendaForm, setVendaForm] = useState({ data_venda: getTodayDate(), preco_venda_final_brl: "", metodo_pagamento: "AVista" });
  const [parcelas, setParcelas] = useState([]);
  const [parcelaForm, setParcelaForm] = useState({ descricao: "", valor: "", data: "" });
  const [loadingRate, setLoadingRate] = useState(false);

  // --- Funções (Corrigidas e sem duplicatas) ---

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
  }, []); // Roda na montagem

  const openModal = (mode, item) => {
    setCurrentItem(item);
    setModalMode(mode);
    if (mode === 'edit') {
      setEditFormData({
        preco_venda_estimado_brl: item.preco_venda_estimado_brl,
        data_compra: item.data_compra, // Data da compra
        preco_compra_usd: item.preco_compra_usd,
        peso_kg: item.peso_kg,
        iof_percent: item.iof_percent,
        taxa_dolar: item.taxa_dolar,
        shipping_method: item.shipping_method,
        // Custo adicional não é editável aqui
      });
    }
    if (mode === 'sell') {
      setVendaForm({
        data_venda: getTodayDate(),
        preco_venda_final_brl: item.preco_venda_estimado_brl.toFixed(2),
        metodo_pagamento: "AVista",
      });
      setParcelas([]);
      setParcelaForm({ descricao: "Parcela 1", valor: "", data: "" });
    }
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setCurrentItem(null);
    setEditFormData({});
    setVendaForm({data_venda: getTodayDate(), preco_venda_final_brl: "", metodo_pagamento: "AVista"});
    setParcelas([]);
    setParcelaForm({ descricao: "", valor: "", data: "" });
    setLoadingRate(false);
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

  const handleDelete = async (id) => {
     if (!window.confirm("Tem certeza que deseja excluir este item?")) return;
    try {
      await api.delete(`/estoque/${id}`);
      onDataChanged();
    } catch (error) {
      alert("Erro ao deletar item.");
    }
  };

  const handleVendaFormChange = (e) => {
    setVendaForm({ ...vendaForm, [e.target.name]: e.target.value });
  };

  const handleParcelaFormChange = (e) => {
    setParcelaForm({ ...parcelaForm, [e.target.name]: e.target.value });
  };

  const handleAddParcela = (e) => {
    e.preventDefault();
    if (!parcelaForm.valor || !parcelaForm.data) {
      alert("Preencha o valor e a data da parcela.");
      return;
    }
    setParcelas([...parcelas, { ...parcelaForm, id: Date.now() }]);
    setParcelaForm({
      descricao: `Parcela ${parcelas.length + 2}`,
      valor: "",
      data: ""
    });
  };

  const removeParcela = (id) => {
    setParcelas(parcelas.filter(p => p.id !== id));
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    if (!currentItem) return;

    const dataToSend = {
      ...vendaForm,
      preco_venda_final_brl: parseFloat(vendaForm.preco_venda_final_brl),
      parcelas: parcelas
    };

    if (dataToSend.metodo_pagamento === 'Parcelado') {
      if (parcelas.length === 0) {
        alert("Modo parcelado selecionado, mas nenhuma parcela foi adicionada.");
        return;
      }
      const totalParcelado = parcelas.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0);
      if (totalParcelado.toFixed(2) !== dataToSend.preco_venda_final_brl.toFixed(2)) {
        alert(`O total das parcelas (R$ ${totalParcelado.toFixed(2)}) não bate com o Preço de Venda Final (R$ ${dataToSend.preco_venda_final_brl.toFixed(2)}).`);
        return;
      }
    }

    try {
      await api.post(`/estoque/${currentItem.id}/vender`, dataToSend);
      closeModal();
      onDataChanged();
    } catch (error) {
      const errorMsg = error.response?.data?.erro || "Erro ao registrar venda.";
      alert(errorMsg);
    }
  };

  const formatarData = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    // Corrige fuso horário para exibição de datas AAAA-MM-DD
    if(isoString.length === 10) {
        date.setDate(date.getDate() + 1);
    }
    return date.toLocaleDateString('pt-BR');
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

  // Função para buscar cotação DENTRO do modal
  const fetchRateForModal = async (date) => {
    if (!date) return;
    try {
      setLoadingRate(true);
      const response = await api.get(`/api/get-exchange-rate?date=${date}`);
      setEditFormData(f => ({ ...f, taxa_dolar: response.data.rate.toFixed(4) }));
    } catch (error) {
      console.error("Erro ao buscar cotação:", error);
      alert("Não foi possível buscar a cotação. Verifique a data.");
    } finally {
      setLoadingRate(false);
    }
  };

  const formatBRL = (value) => `R$ ${value.toFixed(2)}`;

  const totalCusto = stockItems.reduce(
    (acc, item) => acc + (item.custo_total_brl || 0), 0
  );
  const totalVendaEstimada = stockItems.reduce(
    (acc, item) => acc + (item.preco_venda_estimado_brl || 0), 0
  );
  const totalLucroEstimado = stockItems.reduce(
    (acc, item) => acc + (item.lucro_estimado_brl || 0), 0
  );

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
                  <td>{formatarData(item.data_compra)}</td>
                  <td>{formatBRL(item.custo_total_brl)}</td>
                  <td>{formatBRL(item.preco_venda_estimado_brl)}</td>
                  <td style={{color: item.lucro_estimado_brl < 0 ? 'red' : 'green'}}>
                    {formatBRL(item.lucro_estimado_brl)}
                  </td>
                  <td style={{color: item.lucro_estimado_percent < 0 ? 'red' : 'green'}}>
                    {item.lucro_estimado_percent.toFixed(2)}%
                  </td>
                  <td className="action-buttons">
                    <button className="btn-success" onClick={(e) => { e.stopPropagation(); openModal('sell', item); }}>Vender</button>
                    <button onClick={(e) => { e.stopPropagation(); openModal('edit', item); }}>Editar</button>
                    <button className="btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>Excluir</button>
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
                                <strong>Produto:</strong> {formatBRL(valores.custoProdutoBRL)}
                                <span>(${item.preco_compra_usd.toFixed(2)} USD * Cotação R$ {valores.taxaDolar})</span>
                              </li>
                              <li>
                                <strong>IOF:</strong> {formatBRL(valores.custoIofBRL)}
                                <span>({valores.iofPercent}% sobre o valor do produto)</span>
                              </li>
                              <li>
                                <strong>Frete ({valores.shipping_method}):</strong> {formatBRL(valores.custoFreteBRL)}
                                <span>
                                  ({valores.peso} kg * ${valores.shipping_rate.toFixed(2)}/kg * Cotação R$ {valores.taxaDolar})
                                </span>
                              </li>
                              {valores.custoAdicionalBRL > 0 && (
                                <li style={{color: '#b26500'}}>
                                  <strong>Custo Adicional (Rateado):</strong> {formatBRL(valores.custoAdicionalBRL)}
                                </li>
                              )}
                            </ul>
                          );
                        })()}
                        <p className="breakdown-total">
                          Custo Total (BRL): {formatBRL(item.custo_total_brl)}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>

        <tfoot>
          <tr style={{borderTop: '2px solid #333'}}>
            <td colSpan="2" style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1em' }}>
              Totais do Estoque:
            </td>
            <td style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
              {formatBRL(totalCusto)}
            </td>
            <td style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
              {formatBRL(totalVendaEstimada)}
            </td>
            <td style={{ fontWeight: 'bold', fontSize: '1.1em', color: totalLucroEstimado < 0 ? 'red' : 'green' }}>
              {formatBRL(totalLucroEstimado)}
            </td>
            <td colSpan="2"></td>
          </tr>
        </tfoot>

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

        {/* Modal de Edição */}
        {modalMode === 'edit' && currentItem && (
          <div>
            <h2>Editar Dados (Item: {currentItem.nome_produto})</h2>
            <form key={currentItem.id} onSubmit={handleEditSubmit}>
              <div className="input-group">
                <label htmlFor="edit_preco_venda">Preço Venda Estimada (BRL)</label>
                <input id="edit_preco_venda" name="preco_venda_estimado_brl" type="number" step="0.01" value={editFormData.preco_venda_estimado_brl} onChange={handleEditChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="edit_data_compra">Data da Compra</label>
                <input
                  id="edit_data_compra"
                  name="data_compra"
                  type="date"
                  value={editFormData.data_compra}
                  onChange={(e) => {
                    handleEditChange(e);
                    fetchRateForModal(e.target.value);
                  }}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="edit_dolar">Cotação Dólar (R$)</label>
                <input
                  id="edit_dolar"
                  name="taxa_dolar"
                  type="number"
                  step="0.0001"
                  value={editFormData.taxa_dolar}
                  onChange={handleEditChange}
                  placeholder={loadingRate ? "Buscando..." : ""}
                  required
                />
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
                <label htmlFor="edit_shipping">Método de Envio</label>
                <select id="edit_shipping" name="shipping_method" value={editFormData.shipping_method} onChange={handleEditChange}>
                  <option value="Air">Aéreo ($22.50/kg)</option>
                  <option value="Sea">Marítimo ($12.00/kg)</option>
                </select>
              </div>
              {/* Custo adicional não é mais editável aqui */}
              <div className="modal-actions">
                <button type="button" onClick={closeModal}>Cancelar</button>
                <button type="submit">Salvar Alterações</button>
              </div>
            </form>
          </div>
        )}

        {/* Modal de Venda */}
        {modalMode === 'sell' && currentItem && (
          <div>
            <h2>Registrar Venda do Item</h2>
            <p><strong>Produto:</strong> {currentItem.nome_produto} (ID: {currentItem.id})</p>
            <p><strong>Custo Total (BRL):</strong> {formatBRL(currentItem.custo_total_brl)}</p>

            <form onSubmit={handleSellSubmit}>
              <div className="input-group">
                <label htmlFor="data_venda">Data da Venda</label>
                <input id="data_venda" name="data_venda" type="date" value={vendaForm.data_venda} onChange={handleVendaFormChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="sell_price">Preço de Venda Final (BRL)</label>
                <input id="sell_price" name="preco_venda_final_brl" type="number" step="0.01" value={vendaForm.preco_venda_final_brl} onChange={handleVendaFormChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="payment_method">Método de Pagamento</label>
                <select id="payment_method" name="metodo_pagamento" value={vendaForm.metodo_pagamento} onChange={handleVendaFormChange}>
                  <option value="AVista">À Vista (Entra no Caixa)</option>
                  <option value="Parcelado">Parcelado (Gera Contas a Receber)</option>
                </select>
              </div>

              {vendaForm.metodo_pagamento === 'Parcelado' && (
                <div className="parcelado-controls">
                  <strong>Definir Parcelas:</strong>
                  <form onSubmit={handleAddParcela} className="allocator-form">
                    <div className="input-group">
                      <label>Descrição</label>
                      <input name="descricao" value={parcelaForm.descricao} onChange={handleParcelaFormChange} placeholder="Ex: Parcela 1/3" required/>
                    </div>
                    <div className="input-group">
                      <label>Valor (R$)</label>
                      <input name="valor" type="number" step="0.01" value={parcelaForm.valor} onChange={handleParcelaFormChange} required/>
                    </div>
                    <div className="input-group">
                      <label>Data Vencimento</label>
                      <input name="data" type="date" value={parcelaForm.data} onChange={handleParcelaFormChange} required/>
                    </div>
                    <button type="submit">Adicionar Parcela</button>
                  </form>

                  {parcelas.length > 0 && (
                    <>
                      <ul className="parcelas-list">
                        {parcelas.map(p => (
                          <li key={p.id}>
                            {p.descricao} ({formatBRL(parseFloat(p.valor))}) - Venc: {formatarData(p.data)}
                            <button type="button" onClick={() => removeParcela(p.id)}>&times;</button>
                          </li>
                        ))}
                      </ul>
                      <p className="parcelas-total">
                        Total Parcelado: {formatBRL(parcelas.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0))}
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn-success">Confirmar Venda</button>
              </div>
            </form>
          </div>
        )}

        {/* Modal de Exclusão */}
        {modalMode === 'delete' && currentItem && (
          <div>
            <h2>Confirmar Exclusão</h2>
            <p>Você tem certeza que deseja remover este item (<strong>{currentItem.nome_produto}</strong>, ID: {currentItem.id}) do estoque?</p>
            <div className="modal-actions">
              <button type="button" onClick={closeModal}>Cancelar</button>
              <button type="button" className="btn-danger" onClick={() => handleDelete(currentItem.id)}>Confirmar Exclusão</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default StockItemList;