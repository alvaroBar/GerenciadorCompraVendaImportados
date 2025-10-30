// frontend/src/App.js
import React, { useState } from "react";
import StockItemForm from "./components/StockItemForm";
import StockItemList from "./components/StockItemList";
import SettingsForm from "./components/SettingsForm";
import SalesHistory from "./components/SalesHistory";
import FinancialDashboard from "./components/FinancialDashboard";
import FinancialForms from "./components/FinancialForms";
import ContasAPagar from "./components/ContasAPagar";
import EstimationModule from "./components/EstimationModule"; // 1. Importar
import api from "./api";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const [globalSettings, setGlobalSettings] = useState({
    iof_percent: "3.5",
    taxa_dolar: "5.30",
    shipping_method: "Air"
  });

  const handleDataChanged = () => {
    setRefreshKey((prevKey) => prevKey + 1);
  };

  return (
    <div className="App">
      <h1>Gerenciador de Compra e Venda de Acessórios Musicais</h1>

      <FinancialDashboard
        api={api}
        key={refreshKey - 1}
      />

      <FinancialForms
        api={api}
        onDataChanged={handleDataChanged}
      />

      <SettingsForm
        settings={globalSettings}
        onSettingsChange={setGlobalSettings}
      />

      {/* 2. Adicionar o novo Módulo de Estimativa */}
      {/* Ele usa as 'globalSettings', então o colocamos aqui */}
      <EstimationModule
        api={api}
        globalSettings={globalSettings}
      />

      <StockItemForm
        api={api}
        onItemAdded={handleDataChanged}
        globalSettings={globalSettings}
      />

      <ContasAPagar
        api={api}
        key={refreshKey + 2}
        onDataChanged={handleDataChanged}
      />

      <StockItemList
        api={api}
        key={refreshKey}
        onDataChanged={handleDataChanged}
      />

      <SalesHistory
        api={api}
        key={refreshKey + 1}
      />
    </div>
  );
}

export default App;