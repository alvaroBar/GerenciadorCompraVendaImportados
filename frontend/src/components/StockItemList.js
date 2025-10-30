// frontend/src/components/StockItemList.js
import React, { useEffect, useState } from "react";
import Modal from 'react-modal';
import { Fragment } from 'react';

const SHIPPING_RATES = { 'Air': 22.5, 'Sea': 12.0 };

// Pega a data de hoje no formato AAAA-MM-DD
const getTodayDate = () => new Date().toISOString().split('T')[0];

function StockItemList({ api, onDataChanged }) {
  const [stockItems, setStockItems] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('edit');
  const [currentItem, setCurrentItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [openRowId, setOpenRowId] = useState(null);

  // --- 1. Estados para o Modal de Venda (Atualizados) ---
  const [vendaForm, setVendaForm] = useState({
    data_venda: getTodayDate(),
    preco_venda_final_brl: "",
    metodo_pagamento: "AVista",
  });

  const [parcelas, setParcelas] = useState([]); // Array de objetos {descricao, valor, data}
  const [parcelaForm, setParcelaForm] = useState({ // Form de uma nova parcela
    descricao: "",
    valor: "",
    data: ""
  });

  // --- Funções (Edit, Delete, Load - sem mudanças) ---
  const loadItems = async () => { /* ... (igual) */ };
  useEffect(() => { loadItems(); }, []);
  const openModal = (mode, item) => {
    setCurrentItem(item);
    setModalMode(mode);
    if (mode === 'edit') {
      setEditFormData({
        preco_venda_estimado_brl: item.preco_venda_estimado_brl,
        preco_compra_usd: item.preco_compra_usd,
        peso_kg: item.peso_kg, iof_percent: item.iof_percent, taxa_dolar: item.taxa_dolar,
        shipping_method: item.shipping_method, custo_adicional_brl: item.custo_adicional_brl
      });
    }
    if (mode === 'sell') {
      // 2. Reseta o formulário de Venda
      setVendaForm({
        data_venda: getTodayDate(),
        preco_venda_final_brl: item.preco_venda_estimado_brl.toFixed(2),
        metodo_pagamento: "AVista",
      });
      setParcelas([]); // Limpa parcelas anteriores
      setParcelaForm({ descricao: "", valor: "", data: "" });
    }
    setModalIsOpen(true);
  };
   const closeModal = () => {
    setModalIsOpen(false); setCurrentItem(null); setEditFormData({});
    setVendaForm({data_venda: getTodayDate(), preco_venda_final_brl: "", metodo_pagamento: "AVista"});
    setParcelas([]); setParcelaForm({ descricao: "", valor: "", data: "" });
  };
  const handleEditChange = (e) => { setEditFormData({ ...editFormData, [e.target.name]: e.target.value }); };
  const handleEditSubmit = async (e) => {
    e.preventDefault(); if (!currentItem) return;
    try {
      await api.put(`/estoque/${currentItem.id}`, editFormData);
      closeModal(); onDataChanged();
    } catch (error) { alert("Erro ao atualizar item."); }
  };
  const handleDelete = async (id) => { // Corrigido para receber ID
    if (!window.confirm("Tem certeza que deseja excluir este item? Esta ação também excluirá a transação de custo associada.")) return;
    try {
      await api.delete(`/estoque/${id}`); // Usa o ID
      onDataChanged();
    } catch (error) { alert("Erro ao deletar item."); }
  };

  // --- 3. Novas funções para o Modal de Venda ---
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
    setParcelas([...parcelas, { ...parcelaForm, id: Date.now() }]); // Adiciona a nova parcela
    // Limpa o formulário da parcela
    setParcelaForm({
      descricao: `Parcela ${parcelas.length + 2}`,
      valor: "",
      data: ""
    });
  };

  const removeParcela = (id) => {
    setParcelas(parcelas.filter(p => p.id !== id));
  };

  // --- 4. ATUALIZAR 'handleSellSubmit' ---
  const handleSellSubmit = async (e) => {
    e.preventDefault();
    if (!currentItem) return;

    const dataToSend = {
      ...vendaForm, // Contém data_venda, preco_venda_final_brl, metodo_pagamento
      preco_venda_final_brl: parseFloat(vendaForm.preco_venda_final_brl),
      parcelas: parcelas // Envia o array de parcelas
    };

    // Validação
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

  // ... (formatarData, handleRowClick, calcularValores - sem mudanças) ...
  const formatarData = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    // Corrige fuso horário para exibição de datas AAAA-MM-DD
    if(isoString.length === 10) {
        date.setDate(date.getDate() + 1);
    }
    return date.toLocaleDateString('pt-BR');
  };
  const handleRowClick = (itemId) => { setOpenRowId(prevId => (prevId === itemId ? null : itemId)); };
  const calcularValores = (p) => {
    return {
      custoProdutoBRL: p.custo_produto_brl, custoIofBRL: p.custo_iof_brl,
      custoFreteBRL: p.custo_frete_brl, custoAdicionalBRL: p.custo_adicional_brl,
      iofPercent: p.iof_percent, taxaDolar: p.taxa_dolar.toFixed(2),
      peso: p.peso_kg, shipping_method: p.shipping_method,
      shipping_rate: SHIPPING_RATES[p.shipping_method] || SHIPPING_RATES['Air'],
    };
  };

  // --- Renderização ---
  return (
    <div>
      <h2>Itens em Estoque</h2>
      <table>
        {/* ... (thead e tbody/tr principal sem mudanças) ... */}
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
                    <button className="btn-success" onClick={(e) => { e.stopPropagation(); openModal('sell', item); }}>Vender</button>
                    <button onClick={(e) => { e.stopPropagation(); openModal('edit', item); }}>Editar</button>
                    {/* Passa o ID direto para o handleDelete */}
                    <button className="btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>Excluir</button>
                  </td>
                </tr>
                {isRowOpen && ( <tr className="breakdown-row"> ... </tr> )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {/* --- 5. ATUALIZAR O MODAL --- */}
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal} className="modal-content" overlayClassName="modal-overlay">
        <button className="modal-close-button" onClick={closeModal}>&times;</button>

        {/* Modal de Edição (sem mudanças) */}
        {modalMode === 'edit' && currentItem && ( <div> ... </div> )}

        {/* --- 6. ATUALIZAR O MODAL DE VENDA --- */}
        {modalMode === 'sell' && currentItem && (
          <div>
            <h2>Registrar Venda do Item</h2>
            <p><strong>Produto:</strong> {currentItem.nome_produto} (ID: {currentItem.id})</p>
            <p><strong>Custo Total (BRL):</strong> R$ {currentItem.custo_total_brl.toFixed(2)}</p>

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

              {/* --- 7. NOVOS CONTROLES DE PARCELAMENTO --- */}
              {vendaForm.metodo_pagamento === 'Parcelado' && (
                <div className="parcelado-controls">
                  <strong>Definir Parcelas:</strong>
                  {/* Formulário para adicionar UMA parcela */}
                  <form onSubmit={handleAddParcela} className="allocator-form">
                    <div className="input-group">
                      <label>Descrição</label>
                      <input name="descricao" value={parcelaForm.descricao} onChange={handleParcelaFormChange} placeholder="Ex: Parcela 1/3"/>
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

                  {/* Lista de parcelas adicionadas */}
                  {parcelas.length > 0 && (
                    <>
                      <ul className="parcelas-list">
                        {parcelas.map(p => (
                          <li key={p.id}>
                            {p.descricao || 'Parcela'} (R$ {p.valor}) - Venc: {formatarData(p.data)}
                            <button type="button" onClick={() => removeParcela(p.id)}>&times;</button>
                          </li>
                        ))}
                      </ul>
                      <p className="parcelas-total">
                        Total Parcelado: R$ {parcelas.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0).toFixed(2)}
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

        {/* Modal de Exclusão (sem mudanças) */}
        {modalMode === 'delete' && currentItem && ( <div> ... </div> )}
      </Modal>
    </div>
  );
}

export default StockItemList;