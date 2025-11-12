// frontend/src/components/StockItemList.js
import React, { useEffect, useState, useMemo, Fragment } from "react";
import Modal from 'react-modal';

// --- Constantes e Utilitários ---
const SHIPPING_RATES = { 'Air': 22.5, 'Sea': 12.0 };
const getTodayDate = () => new Date().toISOString().split('T')[0];
const formatBRL = (value) => `R$ ${value.toFixed(2)}`;

// --- Componente Principal ---
function StockItemList({ api, onDataChanged }) {
  // --- Estados do Componente ---
  const [stockItems, setStockItems] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('edit');
  const [currentItem, setCurrentItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [openRowId, setOpenRowId] = useState(null);
  const [vendaForm, setVendaForm] = useState({
    data_venda: getTodayDate(),
    preco_venda_final_brl: "",
    metodo_pagamento: "AVista",
    data_recebimento_prevista: ""
  });
  const [parcelas, setParcelas] = useState([]);
  const [parcelaForm, setParcelaForm] = useState({ descricao: "", valor: "", data: "" });
  const [loadingRate, setLoadingRate] = useState(false);

  // Estado para controlar a ordenação (key: coluna, direction: 'ascending' ou 'descending')
  const [sortConfig, setSortConfig] = useState({ key: 'lucro_estimado_brl', direction: 'descending' });

  // --- Carregamento de Dados ---
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

  // --- Lógica de Ordenação (useMemo) ---
  const sortedItems = useMemo(() => {
    let sortableItems = [...stockItems]; // Cria uma cópia

    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        let comparison = 0;

        // Lógica de Sorter Aprimorada para Múltiplos Tipos
        if (sortConfig.key === 'nome_produto') {
          // Ordenação de String (A-Z)
          valA = valA || ''; // Trata nulos
          valB = valB || ''; // Trata nulos
          comparison = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' });

        } else if (sortConfig.key === 'data_compra') {
          // Ordenação de Data (ISO String)
          valA = valA || '';
          valB = valB || '';
          if (valA < valB) comparison = -1;
          if (valA > valB) comparison = 1;

        } else {
          // Ordenação Numérica (para todas as outras colunas)
          valA = parseFloat(valA) || 0;
          valB = parseFloat(valB) || 0;
          if (valA < valB) comparison = -1;
          if (valA > valB) comparison = 1;
        }

        // Aplica a direção (Ascendente ou Descendente)
        return sortConfig.direction === 'ascending' ? comparison : (comparison * -1);
      });
    }
    return sortableItems;
  }, [stockItems, sortConfig]); // Dependências

  // --- Funções de Manipulação (Handlers) ---

  // Define a coluna e direção da ordenação ao clicar no cabeçalho
  const requestSort = (key) => {
    let direction = 'ascending'; // Default

    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'; // Inverte se já for ascendente
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending'; // Inverte se já for descendente
    }
    // Se for uma coluna nova
    else if (sortConfig.key !== key) {
      // Colunas de texto/data começam A-Z (Ascendente)
      if (key === 'nome_produto' || key === 'data_compra') {
        direction = 'ascending';
      } else {
        // Colunas de números (dinheiro, %) começam Maior-Menor (Descendente)
        direction = 'descending';
      }
    }

    setSortConfig({ key, direction });
  };

  // Retorna o ícone (▲/▼) para a coluna que está sendo ordenada
  const getSortIndicator = (name) => {
    if (sortConfig.key === name) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return null;
  };

  // Abre o modal (Editar, Vender, Excluir)
  const openModal = (mode, item) => {
    setCurrentItem(item);
    setModalMode(mode);
    if (mode === 'edit') {
      setEditFormData({
        preco_venda_estimado_brl: item.preco_venda_estimado_brl,
        data_compra: item.data_compra,
        preco_compra_usd: item.preco_compra_usd,
        peso_kg: item.peso_kg,
        iof_percent: item.iof_percent,
        taxa_dolar: item.taxa_dolar,
        shipping_method: item.shipping_method,
      });
    }
    if (mode === 'sell') {
      setVendaForm({
        data_venda: getTodayDate(),
        preco_venda_final_brl: item.preco_venda_estimado_brl.toFixed(2),
        metodo_pagamento: "AVista",
        data_recebimento_prevista: ""
      });
      setParcelas([]);
      setParcelaForm({ descricao: "Parcela 1", valor: "", data: "" });
    }
    setModalIsOpen(true);
  };

  // Fecha o modal e reseta os formulários
  const closeModal = () => {
    setModalIsOpen(false);
    setCurrentItem(null);
    setEditFormData({});
    setVendaForm({
      data_venda: getTodayDate(),
      preco_venda_final_brl: "",
      metodo_pagamento: "AVista",
      data_recebimento_prevista: ""
    });
    setParcelas([]);
    setParcelaForm({ descricao: "", valor: "", data: "" });
    setLoadingRate(false);
  };

  // Atualiza o formulário de edição
  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  // Envia o formulário de edição
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentItem) return;
    try {
      await api.put(`/estoque/${currentItem.id}`, editFormData);
      closeModal();
      onDataChanged(); // Atualiza dados na interface principal
    } catch (error) {
      alert("Erro ao atualizar item.");
    }
  };

  // Deleta um item
  const handleDelete = async (id) => {
     if (!window.confirm("Tem certeza que deseja excluir este item?")) return;
    try {
      await api.delete(`/estoque/${id}`);
      onDataChanged(); // Atualiza dados na interface principal
    } catch (error) {
      alert("Erro ao deletar item.");
    }
  };

  // Atualiza o formulário de venda
  const handleVendaFormChange = (e) => {
    setVendaForm({ ...vendaForm, [e.target.name]: e.target.value });
  };

  // Atualiza o formulário de parcela
  const handleParcelaFormChange = (e) => {
    setParcelaForm({ ...parcelaForm, [e.target.name]: e.target.value });
  };

  // Adiciona uma nova parcela na lista
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

  // Remove uma parcela da lista
  const removeParcela = (id) => {
    setParcelas(parcelas.filter(p => p.id !== id));
  };

  // Envia o formulário de venda
  const handleSellSubmit = async (e) => {
    e.preventDefault();
    if (!currentItem) return;

    const dataToSend = {
      data_venda: vendaForm.data_venda,
      preco_venda_final_brl: parseFloat(vendaForm.preco_venda_final_brl),
      metodo_pagamento: vendaForm.metodo_pagamento,
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
      dataToSend.parcelas = parcelas;
    }
    else if (dataToSend.metodo_pagamento === 'Marketplace') {
      if (!vendaForm.data_recebimento_prevista) {
        alert("Para venda via Marketplace, a 'Data Prevista de Recebimento' é obrigatória.");
        return;
      }
      dataToSend.data_recebimento_prevista = new Date(vendaForm.data_recebimento_prevista + 'T00:00:00').toISOString();
    }

    try {
      await api.post(`/estoque/${currentItem.id}/vender`, dataToSend);
      closeModal();
      onDataChanged(); // Atualiza dados na interface principal
    } catch (error) {
      const errorMsg = error.response?.data?.erro || "Erro ao registrar venda.";
      alert(errorMsg);
    }
  };

  // Formata data ISO (corrigindo fuso)
  const formatarData = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    if(isoString.length === 10) { // Se for AAAA-MM-DD
        date.setDate(date.getDate() + 1); // Corrige bug de fuso horário
    }
    return date.toLocaleDateString('pt-BR');
  };

  // Expande/contrai a linha de detalhes
  const handleRowClick = (itemId) => {
    setOpenRowId(prevId => (prevId === itemId ? null : itemId));
  };

  // Calcula valores de detalhe (helper)
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

  // Busca cotação do dólar no modal de edição
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

  // --- Cálculos de Total (Rodapé) ---
  const totalCusto = stockItems.reduce((acc, item) => acc + (item.custo_total_brl || 0), 0);
  const totalVendaEstimada = stockItems.reduce((acc, item) => acc + (item.preco_venda_estimado_brl || 0), 0);
  const totalLucroEstimado = stockItems.reduce((acc, item) => acc + (item.lucro_estimado_brl || 0), 0);

  // --- Renderização (JSX) ---
  return (
    <div>
      <h2>Itens em Estoque</h2>
      <table>
        {/* Cabeçalho da Tabela (com onClick para Ordenação) */}
        <thead>
          <tr>
            <th onClick={() => requestSort('nome_produto')}>
              Nome {getSortIndicator('nome_produto')}
            </th>
            <th onClick={() => requestSort('data_compra')}>
              Data Compra {getSortIndicator('data_compra')}
            </th>
            <th onClick={() => requestSort('custo_total_brl')}>
              Custo Total (BRL) {getSortIndicator('custo_total_brl')}
            </th>
            <th onClick={() => requestSort('preco_venda_estimado_brl')}>
              Venda Estimada (BRL) {getSortIndicator('preco_venda_estimado_brl')}
            </th>
            <th onClick={() => requestSort('lucro_estimado_brl')}>
              Lucro Estimado (BRL) {getSortIndicator('lucro_estimado_brl')}
            </th>
            <th onClick={() => requestSort('lucro_estimado_percent')}>
              Lucro (%) {getSortIndicator('lucro_estimado_percent')}
            </th>
            <th>Ações</th>
          </tr>
        </thead>

        {/* Corpo da Tabela (Renderiza a partir de 'sortedItems') */}
        <tbody>
          {sortedItems.map((item) => { // <-- USA O ARRAY ORDENADO
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

                {/* Linha de Detalhes (Expandida) */}
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

        {/* Rodapé da Tabela (Totais) */}
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

      {/* --- Seção do Modal --- */}
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
              <div className="modal-actions">
                <button type="button" onClick={closeModal}>Cancelar</button>
                <button type="submit">Salvar Alterações</button>
              </div>
            </form>
          </div>
        )}

        {/* Modal de Venda (com Marketplace) */}
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
                  <option value="Marketplace">Marketplace (ML, Shopee, etc)</option>
                  <option value="Parcelado">Parcelado (Gera Contas a Receber)</option>
                </select>
              </div>

              {/* Campo Condicional para Marketplace */}
              {vendaForm.metodo_pagamento === 'Marketplace' && (
                <div className="input-group">
                  <label htmlFor="data_recebimento_prevista">Data Prevista de Recebimento</label>
                  <input
                    id="data_recebimento_prevista"
                    name="data_recebimento_prevista"
                    type="date"
                    value={vendaForm.data_recebimento_prevista}
                    onChange={handleVendaFormChange}
                  />
                </div>
              )}

              {/* Campo Condicional para Parcelado */}
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