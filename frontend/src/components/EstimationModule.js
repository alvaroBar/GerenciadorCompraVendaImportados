// frontend/src/components/EstimationModule.js
import React, { useState, useEffect } from "react"; // 1. Importar useEffect

function EstimationModule({ api, globalSettings }) {

  const [form, setForm] = useState({
    preco_compra_valor: "",
    peso_kg: ""
  });

  const [moedaCompra, setMoedaCompra] = useState("USD");

  // 2. Novo estado para o método de envio, inicializado pelo global
  const [shippingMethod, setShippingMethod] = useState(globalSettings.shipping_method);

  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  // 3. Efeito para atualizar o estado local se a config global mudar
  useEffect(() => {
    setShippingMethod(globalSettings.shipping_method);
  }, [globalSettings.shipping_method]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultado(null);

    try {
      // --- Lógica de Conversão de Moeda (sem mudanças) ---
      let precoCompraEmUSD;
      const valorDigitado = parseFloat(form.preco_compra_valor);
      const taxaDolar = parseFloat(globalSettings.taxa_dolar);

      if (moedaCompra === "BRL") {
        if (!taxaDolar || taxaDolar === 0) {
          alert("A 'Cotação do Dólar' nas Configurações Globais deve ser maior que zero para converter BRL.");
          setLoading(false);
          return;
        }
        precoCompraEmUSD = valorDigitado / taxaDolar;
      } else {
        precoCompraEmUSD = valorDigitado;
      }

      // 4. Prepara os dados para enviar à API
      const dataToSend = {
        peso_kg: parseFloat(form.peso_kg),
        preco_compra_usd: precoCompraEmUSD,

        // Pega o IOF e Dólar das configs globais
        iof_percent: globalSettings.iof_percent,
        taxa_dolar: globalSettings.taxa_dolar,

        // 5. Envia o método de envio do estado local
        shipping_method: shippingMethod
      };

      const response = await api.post('/estimativa/calcular', dataToSend);
      setResultado(response.data);

    } catch (error) {
      alert("Erro ao calcular estimativa.");
    } finally {
      setLoading(false);
    }
  };

  const formatBRL = (value) => `R$ ${value.toFixed(2)}`;

  return (
    <div className="estimation-module">
      <h2>Módulo de Orçamento (Estimativa)</h2>
      <form onSubmit={handleSubmit}>
        <div className="estimation-form-inputs">

          {/* Campo de Preço (sem mudanças) */}
          <div className="input-group">
            <label htmlFor="est_preco_compra_valor">Preço Compra</label>
            <input
              id="est_preco_compra_valor"
              name="preco_compra_valor"
              type="number"
              step="0.01"
              value={form.preco_compra_valor}
              onChange={handleChange}
              placeholder={`Valor em ${moedaCompra}`}
              required
            />
            <select value={moedaCompra} onChange={(e) => setMoedaCompra(e.target.value)}>
              <option value="USD">USD ($)</option>
              <option value="BRL">BRL (R$)</option>
            </select>
          </div>

          {/* Campo de Peso (sem mudanças) */}
          <div className="input-group">
            <label htmlFor="est_peso_kg">Peso (kg)</label>
            <input
              id="est_peso_kg"
              name="peso_kg"
              type="number"
              step="0.01"
              value={form.peso_kg}
              onChange={handleChange}
              placeholder="Ex: 0.6"
              required
            />
          </div>

          {/* 6. Novo Seletor de Método de Envio */}
          <div className="input-group">
            <label htmlFor="est_shipping">Método de Envio</label>
            <select
              id="est_shipping"
              name="shipping_method"
              value={shippingMethod} // Controlado pelo estado local
              onChange={(e) => setShippingMethod(e.target.value)} // Atualiza o estado local
            >
              <option value="Air">Aéreo ($22.50/kg)</option>
              <option value="Sea">Marítimo ($12.00/kg)</option>
            </select>
          </div>

          <div className="input-group">
            <label style={{ visibility: 'hidden' }}>Calcular</label>
            <button type="submit" disabled={loading}>
              {loading ? 'Calculando...' : 'Calcular Custo Final'}
            </button>
          </div>
        </div>
      </form>

      {/* --- Resultados (sem mudanças) --- */}
      {resultado && (
        <div className="estimation-results">
          {/* Coluna 1: Custo Real */}
          <div>
            <h4>Custo Real (Detalhado)</h4>
            <ul>
              <li>
                <strong>Produto (em BRL):</strong>
                <span>{formatBRL(resultado.real_detalhado.custo_produto_brl)}</span>
              </li>
              <li>
                <strong>IOF ({resultado.real_detalhado.iof_usado}%):</strong>
                <span>{formatBRL(resultado.real_detalhado.custo_iof_brl)}</span>
              </li>
              <li>
                <strong>Frete (${resultado.real_detalhado.taxa_envio_usada.toFixed(2)}/kg):</strong>
                <span>{formatBRL(resultado.real_detalhado.custo_frete_brl)}</span>
              </li>
            </ul>
            <div className="estimation-total">
              <strong>Total:</strong>
              <span>{formatBRL(resultado.real_detalhado.custo_total_brl)}</span>
            </div>
          </div>

          {/* Coluna 2: Custo por Taxa Rápida */}
          <div>
            <h4>Custo Estimado (Taxa {resultado.estimativa_taxa_rapida.taxa_usada}%)</h4>
            <ul>
              <li>
                <strong>Produto (em BRL):</strong>
                <span>{formatBRL(resultado.estimativa_taxa_rapida.custo_produto_brl)}</span>
              </li>
              <li>
                <strong>Imposto ({resultado.estimativa_taxa_rapida.taxa_usada}%):</strong>
                <span>{formatBRL(resultado.estimativa_taxa_rapida.custo_imposto_brl)}</span>
              </li>
            </ul>
            <div className="estimation-total">
              <strong>Total:</strong>
              <span>{formatBRL(resultado.estimativa_taxa_rapida.custo_total_brl)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EstimationModule;