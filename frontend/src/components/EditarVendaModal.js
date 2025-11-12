// frontend/src/components/EditarVendaModal.js
import React, { useState } from 'react';

// Adicione seu próprio CSS para estilizar o modal
// import './EditarVendaModal.css';

function EditarVendaModal({ venda, onClose, onSave }) {
  const [precoVenda, setPrecoVenda] = useState(venda.preco_venda_final_brl);

  // O input 'date' precisa do formato AAAA-MM-DD
  const dataFormatada = venda.data_venda.split('T')[0];
  const [dataVenda, setDataVenda] = useState(dataFormatada);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      preco_venda_final_brl: parseFloat(precoVenda),
      // Converte a data (que está como string local) para ISO string
      data_venda: new Date(dataVenda + 'T00:00:00').toISOString(),
    });
  };

  return (
    // Um modal básico. Você pode usar uma biblioteca (ex: React-Modal)
    // ou estilizar o seu com CSS.
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Editar Venda</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Preço Final da Venda (BRL)</label>
            <input
              type="number"
              step="0.01"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Data da Venda</label>
            <input
              type="date"
              value={dataVenda}
              onChange={(e) => setDataVenda(e.target.value)}
              required
            />
          </div>
          <div className="modal-actions">
            <button type="submit">Salvar</button>
            <button type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditarVendaModal;