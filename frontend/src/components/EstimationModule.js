// frontend/src/components/EstimationModule.js
import React, { useState, useEffect } from "react";

const getTodayDate = () => new Date().toISOString().split('T')[0];

function EstimationModule({ api, globalSettings }) {

  const [form, setForm] = useState({
    preco_compra_valor: "",
    peso_kg: "",
    data_estimativa: getTodayDate(), // 1. Adicionar data ao estado
    taxa_dolar: globalSettings.taxa_dolar // 2. Adicionar taxa_dolar ao estado local
  });

  const [moedaCompra, setMoedaCompra] = useState("USD");
  const [shippingMethod, setShippingMethod] = useState(globalSettings.shipping_method);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  // 3. Atualiza o formulário se as configs globais mudarem
  useEffect(() => {
    setShippingMethod(globalSettings.shipping_method);
    // Só atualiza a taxa_dolar se não estivermos buscando uma
    if (!loading) {
      setForm(f => ({ ...f, taxa_dolar: globalSettings.taxa_dolar }));
    }
  }, [globalSettings]);

  // 4. Efeito para buscar a cotação quando a data mudar
  useEffect(() => {
    const data = form.data_estimativa;
    if (data) {
      fetchRate(data);
    }
  }, [form.data_estimativa]); // Roda quando a data muda

  const fetchRate = async (date) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/get-exchange-rate?date=${date}`);
      setForm(f => ({ ...f, taxa_dolar: response.data.rate.toFixed(4) }));
    } catch (error) {
      console.error("Erro ao buscar cotação:", error);
      // Mantém a cotação global se falhar
      setForm(f => ({ ...f, taxa_dolar: globalSettings.taxa_dolar }));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultado(null);

    try {
      let precoCompraEmUSD;
      const valorDigitado = parseFloat(form.preco_compra_valor);
      const taxaDolar = parseFloat(form.taxa_dolar); // Usa a taxa do formulário

      if (moedaCompra === "BRL") {
        if (!taxaDolar || taxaDolar === 0) {
          alert("A 'Cotação do Dólar' deve ser maior que zero.");
          setLoading(false);
          return;
        }
        precoCompraEmUSD = valorDigitado / taxaDolar;
      } else {
        precoCompraEmUSD = valorDigitado;
      }

      const dataToSend = {
        peso_kg: parseFloat(form.peso_kg),
        preco_compra_usd: precoCompraEmUSD,
        iof_percent: globalSettings.iof_percent, // Pega IOF global
        taxa_dolar: taxaDolar, // Envia a taxa do formulário
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

          {/* 5. Adicionar campo de Data */}
          <div className="input-group">
            <label htmlFor="est_data_estimativa">Data da Estimativa</label>
            <input
              id="est_data_estimativa"
              name="data_estimativa"
              type="date"
              value={form.data_estimativa}
              onChange={handleChange}
              required
            />
          </div>

          {/* 6. Adicionar campo Cotação Dólar (auto-preenchido) */}
          <div className="input-group">
            <label htmlFor="est_taxa_dolar">Cotação Dólar (R$)</label>
            <input
              id="est_taxa_dolar"
              name="taxa_dolar"
              type="number"
              step="0.0001"
              value={form.taxa_dolar}
              onChange={handleChange}
              placeholder="Buscando..."
              required
            />
          </div>

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

          <div className="input-group">
            <label htmlFor="est_shipping">Método de Envio</label>
            <select
              id="est_shipping"
              name="shipping_method"
              value={shippingMethod}
              onChange={(e) => setShippingMethod(e.target.value)}
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
          {resultado.estimativa_7_percent && (
            <div>
              <h4>Custo Estimado (Taxa 7% + IOF 3.5%)</h4>
              <ul>
                <li><strong>Produto (em BRL):</strong> <span>{formatBRL(resultado.estimativa_7_percent.custo_produto_brl)}</span></li>
                <li><strong>Taxa ({resultado.estimativa_7_percent.taxa_7_usada}%):</strong> <span>{formatBRL(resultado.estimativa_7_percent.custo_taxa_7_brl)}</span></li>
                <li><strong>IOF ({resultado.estimativa_7_percent.taxa_iof_usada}%):</strong> <span>{formatBRL(resultado.estimativa_7_percent.custo_iof_estimado_brl)}</span></li>
                <li><strong>Frete:</strong> <span>{formatBRL(resultado.estimativa_7_percent.custo_frete_brl)}</span></li>
              </ul>
              <div className="estimation-total">
                <strong>Total:</strong>
                <span>{formatBRL(resultado.estimativa_7_percent.custo_total_brl)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EstimationModule;