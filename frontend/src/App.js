// frontend/src/App.js
import React, { useState } from "react";
// ... (todos os outros imports)
import FinancialDashboard from "./components/FinancialDashboard";
import FinancialForms from "./components/FinancialForms";
import SettingsForm from "./components/SettingsForm";
import EstimationModule from "./components/EstimationModule";
import StockItemForm from "./components/StockItemForm";
import ContasAPagar from "./components/ContasAPagar";
import CostAllocator from "./components/CostAllocator"; // 1. Importar
import StockItemList from "./components/StockItemList";
import SalesHistory from "./components/SalesHistory";
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

      <FinancialDashboard api={api} key={refreshKey - 1} />
      <FinancialForms api={api} onDataChanged={handleDataChanged} />
      <SettingsForm settings={globalSettings} onSettingsChange={setGlobalSettings} />
      <EstimationModule api={api} globalSettings={globalSettings} />

      {/* 2. Adicionar o Rateador de Custo */}
      {/* Ele precisa do 'refreshKey' para recarregar a lista de itens */}
      <CostAllocator
        api={api}
        key={refreshKey + 3}
        onDataChanged={handleDataChanged}
      />

      <StockItemForm api={api} onItemAdded={handleDataChanged} globalSettings={globalSettings} />
      <ContasAPagar api={api} key={refreshKey + 2} onDataChanged={handleDataChanged} />
      <StockItemList api={api} key={refreshKey} onDataChanged={handleDataChanged} />
      <SalesHistory api={api} key={refreshKey + 1} />
    </div>
  );
}

export default App;