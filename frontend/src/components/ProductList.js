// frontend/src/components/ProductList.js
import React, { useEffect, useState } from "react";
import Modal from 'react-modal';
import { Fragment } from 'react';

// Trazer as taxas para o frontend também, para exibição
const SHIPPING_RATES = {
  'Air': 22.5,
  'Sea': 12.0
};

function ProductList({ api, onDataChanged }) {
  const [products, setProducts] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('edit');
  const [currentProduct, setCurrentProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [openRowId, setOpenRowId] = useState(null);

  // --- FUNÇÕES QUE FALTAVAM ---

  const loadProducts = async () => {
    try {
      const response = await api.get("/produtos");
      setProducts(response.data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      alert("Não foi possível carregar a lista de produtos.");
    }
  };

  useEffect(() => {
    loadProducts();
  }, []); // Roda na montagem do componente (e quando a key muda)

  const openModal = (mode, product) => {
    setCurrentProduct(product);
    setModalMode(mode);
    if (mode === 'edit') {
      // Preenche o formulário de edição com os dados do produto
      setEditFormData(product);
    }
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setCurrentProduct(null);
    setEditFormData({});
  };

  const handleEditChange = (e) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentProduct) return;
    try {
      await api.put(`/produtos/${currentProduct.id}`, editFormData);
      closeModal();
      onDataChanged(); // Força o App.js a recarregar a lista
    } catch (error) {
      alert("Erro ao atualizar produto.");
    }
  };

  const handleDelete = async () => {
    if (!currentProduct) return;
    try {
      await api.delete(`/produtos/${currentProduct.id}`);
      closeModal();
      onDataChanged(); // Força o App.js a recarregar a lista
    } catch (error) {
      alert("Erro ao deletar produto.");
    }
  };

  const formatarData = (isoString) => {
    if (!isoString) return 'N/A';
    // Formata a data para o padrão pt-BR (dd/mm/aaaa)
    return new Date(isoString).toLocaleDateString('pt-BR');
  };

  const handleRowClick = (productId) => {
    // Se o ID clicado já está aberto, fecha-o (null). Senão, abre o novo ID.
    setOpenRowId(prevId => (prevId === productId ? null : productId));
  };

  // --- FUNÇÃO DE CÁLCULO ATUALIZADA ---

  const calcularValores = (p) => {
    const precoCompraUSD = p.preco_compra;
    const precoVendaBRL = p.preco_venda;
    const iofPercent = p.iof_percent;
    const iof = iofPercent / 100;
    const freteUSD = p.frete_usd; // Já vem correto do backend
    const taxaDolar = p.taxa_dolar;

    const custoProdutoBRL = precoCompraUSD * taxaDolar;
    const custoIofBRL = (precoCompraUSD * iof) * taxaDolar;
    const custoFreteBRL = freteUSD * taxaDolar;

    const custoTotalBRL = custoProdutoBRL + custoIofBRL + custoFreteBRL;
    const lucroBRL = precoVendaBRL - custoTotalBRL;
    const lucroPercent = custoTotalBRL > 0 ? (lucroBRL / custoTotalBRL) * 100 : 0;

    return {
      custoProdutoBRL: custoProdutoBRL.toFixed(2),
      custoIofBRL: custoIofBRL.toFixed(2),
      custoFreteBRL: custoFreteBRL.toFixed(2),
      iofPercent: iofPercent,
      taxaDolar: taxaDolar.toFixed(2),

      // Passar os dados do frete para o detalhamento
      peso: p.peso,
      shipping_method: p.shipping_method,
      shipping_rate: SHIPPING_RATES[p.shipping_method] || SHIPPING_RATES['Air'],

      custoTotalBRL: custoTotalBRL.toFixed(2),
      lucroBRL: lucroBRL.toFixed(2),
      lucroPercent: lucroPercent.toFixed(2),
    };
  };


  // --- RENDERIZAÇÃO ---
  return (
    <div>
      <h2>Lista de Produtos</h2>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Data Cadastro</th>
            <th>Compra (USD)</th>
            <th>Frete (USD)</th>
            <th>Venda (BRL)</th>
            <th>Custo Total (BRL)</th>
            <th>Lucro (BRL)</th>
            <th>Lucro (%)</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const valores = calcularValores(p);
            const isRowOpen = openRowId === p.id;

            return (
              <Fragment key={p.id}>
                <tr className="product-row" onClick={() => handleRowClick(p.id)}>
                  <td>{p.nome} {isRowOpen ? '▲' : '▼'}</td>
                  <td>{formatarData(p.data_cadastro)}</td>
                  <td>${p.preco_compra.toFixed(2)}</td>
                  <td>${p.frete_usd.toFixed(2)}</td>
                  <td>R$ {p.preco_venda.toFixed(2)}</td>
                  <td>R$ {valores.custoTotalBRL}</td>
                  <td>R$ {valores.lucroBRL}</td>
                  <td>{valores.lucroPercent}%</td>
                  <td className="action-buttons">
                    <button onClick={(e) => { e.stopPropagation(); openModal('edit', p); }}>Editar</button>
                    <button className="btn-danger" onClick={(e) => { e.stopPropagation(); openModal('delete', p); }}>Excluir</button>
                  </td>
                </tr>

                {isRowOpen && (
                  <tr className="breakdown-row">
                    <td colSpan="9">
                      <div className="breakdown-content">
                        <h4>Detalhamento de Custo (R$) para: {p.nome}</h4>
                        <ul>
                          <li>
                            <strong>Produto:</strong> R$ {valores.custoProdutoBRL}
                            <span>(${p.preco_compra.toFixed(2)} USD * Cotação R$ {valores.taxaDolar})</span>
                          </li>
                          <li>
                            <strong>IOF:</strong> R$ {valores.custoIofBRL}
                            <span>({valores.iofPercent}% sobre o valor do produto em USD)</span>
                          </li>
                          <li>
                            <strong>Frete ({valores.shipping_method}):</strong> R$ {valores.custoFreteBRL}
                            <span>
                              ({valores.peso} kg * ${valores.shipping_rate.toFixed(2)}/kg * Cotação R$ {valores.taxaDolar})
                            </span>
                          </li>
                        </ul>
                        <p className="breakdown-total">
                          Custo Total (BRL): R$ {valores.custoTotalBRL}
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

      {/* --- MODAL --- */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        className="modal-content"
        overlayClassName="modal-overlay"
        contentLabel="Ações do Produto"
      >
        <button className="modal-close-button" onClick={closeModal}>&times;</button>

        {modalMode === 'edit' && currentProduct && (
          <div>
            <h2>Editar Produto: {currentProduct.nome}</h2>
            <form key={currentProduct.id} onSubmit={handleEditSubmit} className="input-group-column">
              <div className="input-group">
                <label htmlFor="edit_nome">Nome</label>
                <input id="edit_nome" name="nome" value={editFormData.nome} onChange={handleEditChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="edit_preco_compra">Preço Compra (USD)</label>
                <input id="edit_preco_compra" name="preco_compra" type="number" step="0.01" value={editFormData.preco_compra} onChange={handleEditChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="edit_preco_venda">Preço Venda (BRL)</label>
                <input id="edit_preco_venda" name="preco_venda" type="number" step="0.01" value={editFormData.preco_venda} onChange={handleEditChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="edit_peso">Peso (kg)</label>
                <input id="edit_peso" name="peso" type="number" step="0.01" value={editFormData.peso} onChange={handleEditChange} required />
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
                <select
                  id="edit_shipping"
                  name="shipping_method"
                  value={editFormData.shipping_method}
                  onChange={handleEditChange}
                >
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

        {modalMode === 'delete' && currentProduct && (
          <div>
            <h2>Confirmar Exclusão</h2>
            <p>Você tem certeza que deseja remover o produto <strong>{currentProduct.nome}</strong>?</p>
            <p>Esta ação não pode ser desfeita.</p>
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

export default ProductList;