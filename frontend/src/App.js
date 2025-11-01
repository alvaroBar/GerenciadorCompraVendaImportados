// frontend/src/App.js
import React, { useState } from "react";
import StockItemForm from "./components/StockItemForm";
import StockItemList from "./components/StockItemList";
import SettingsForm from "./components/SettingsForm";
import SalesHistory from "./components/SalesHistory";
import FinancialDashboard from "./components/FinancialDashboard";
import FinancialForms from "./components/FinancialForms";
import ManualTransactionList from "./components/ManualTransactionList";
import ContasAPagar from "./components/ContasAPagar";
import LoteCustoForm from "./components/LoteCustoForm";
import LoteCustoList from "./components/LoteCustoList";
import ContasAReceber from "./components/ContasAReceber";
import EstimationModule from "./components/EstimationModule";
import BackupManager from "./components/BackupManager"; // O novo import
import api from "./api";

function App() {

  // --- Definições Corretas (Sem Duplicatas) ---
  const [refreshKey, setRefreshKey] = useState(0);

  const [globalSettings, setGlobalSettings] = useState({
    iof_percent: "3.5",
    taxa_dolar: "5.30",
    shipping_method: "Air"
  });

  const handleDataChanged = () => {
    setRefreshKey((prevKey) => prevKey + 1);
  };
  // ---------------------------------------------

  return (
    <div className="App">
      <h1>Gerenciador de Compra e Venda de Acessórios Musicais</h1>

      {/* --- Todos os seus componentes existentes --- */}
      <FinancialDashboard api={api} key={refreshKey - 1} />
      <FinancialForms api={api} onDataChanged={handleDataChanged} />
      <ManualTransactionList api={api} key={refreshKey + 5} onDataChanged={handleDataChanged} />
      <SettingsForm settings={globalSettings} onSettingsChange={setGlobalSettings} />
      <EstimationModule api={api} globalSettings={globalSettings} />
      <LoteCustoForm api={api} key={refreshKey + 3} onDataChanged={handleDataChanged} />
      <LoteCustoList api={api} key={refreshKey + 6} onDataChanged={handleDataChanged} />
      <StockItemForm api={api} onItemAdded={handleDataChanged} globalSettings={globalSettings} />
      <ContasAReceber api={api} key={refreshKey + 4} onDataChanged={handleDataChanged} />
      <ContasAPagar api={api} key={refreshKey + 2} onDataChanged={handleDataChanged} />
      <StockItemList api={api} key={refreshKey} onDataChanged={handleDataChanged} />
      <SalesHistory api={api} key={refreshKey + 1} />

      {/* --- Novo Componente de Backup --- */}
      <BackupManager api={api} />

    </div>
  );
}

export default App;