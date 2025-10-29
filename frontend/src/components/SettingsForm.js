// components/SettingsForm.js
import React from 'react';

function SettingsForm({ settings, onSettingsChange }) {

  const handleChange = (e) => {
    onSettingsChange({
      ...settings,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div style={{ background: '#e9ecef', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
      <h2>Configurações Globais</h2>

      <div className="input-group">
        <label htmlFor="global_iof">IOF (%)</label>
        <input
          id="global_iof"
          name="iof_percent"
          type="number"
          step="0.01"
          value={settings.iof_percent}
          onChange={handleChange}
        />
      </div>

      <div className="input-group">
        <label htmlFor="global_dolar">Cotação Dólar (R$)</label>
        <input
          id="global_dolar"
          name="taxa_dolar"
          type="number"
          step="0.01"
          value={settings.taxa_dolar}
          onChange={handleChange}
        />
      </div>

      {/* --- 1. Novo Seletor de Método de Envio --- */}
      <div className="input-group">
        <label htmlFor="global_shipping">Envio Padrão</label>
        <select
          id="global_shipping"
          name="shipping_method"
          value={settings.shipping_method}
          onChange={handleChange}
        >
          <option value="Air">Aéreo ($22.50/kg)</option>
          <option value="Sea">Marítimo ($12.00/kg)</option>
        </select>
      </div>

    </div>
  );
}

export default SettingsForm;