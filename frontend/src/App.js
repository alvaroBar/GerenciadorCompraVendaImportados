// frontend/src/App.js
import React, { useState } from "react";
// ... (todos os outros imports)
import FinancialDashboard from "./components/FinancialDashboard";
import FinancialForms from "./components/FinancialForms";
import ManualTransactionList from "./components/ManualTransactionList";
import SettingsForm from "./components/SettingsForm";
import EstimationModule from "./components/EstimationModule";
import StockItemForm from "./components/StockItemForm";
import ContasAPagar from "./components/ContasAPagar";
import LoteCustoForm from "./components/LoteCustoForm"; // 1. Renomeado
import LoteCustoList from "./components/LoteCustoList"; // 2. NOVO
import ContasAReceber from "./components/ContasAReceber";
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
      <ManualTransactionList api={api} key={refreshKey + 5} onDataChanged={handleDataChanged} />
      <SettingsForm settings={globalSettings} onSettingsChange={setGlobalSettings} />
      <EstimationModule api={api} globalSettings={globalSettings} />

      {/* 3. Formulário de Lote de Custo */}
      <LoteCustoForm
        api={api}
        key={refreshKey + 3}
        onDataChanged={handleDataChanged}
      />

      {/* 4. Lista de Lotes de Custo */}
      <LoteCustoList
        api={api}
        key={refreshKey + 6} // Chave nova
        onDataChanged={handleDataChanged}
      />

      <StockItemForm api={api} onItemAdded={handleDataChanged} globalSettings={globalSettings} />
      <ContasAReceber api={api} key={refreshKey + 4} onDataChanged={handleDataChanged} />
      <ContasAPagar api={api} key={refreshKey + 2} onDataChanged={handleDataChanged} />
      <StockItemList api={api} key={refreshKey} onDataChanged={handleDataChanged} />
      <SalesHistory api={api} key={refreshKey + 1} />
    </div>
  );
}

export default App;