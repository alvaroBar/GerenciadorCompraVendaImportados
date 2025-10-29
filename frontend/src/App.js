import React, { useState } from "react";
import ProductForm from "./components/ProductForm";
import ProductList from "./components/ProductList";
import SettingsForm from "./components/SettingsForm";
import api from "./api";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const [globalSettings, setGlobalSettings] = useState({
    iof_percent: "3.5",
    taxa_dolar: "5.30",
    shipping_method: "Air"
  });

  // Esta função agora serve para CADA mudança nos dados
  const handleDataChanged = () => {
    setRefreshKey((prevKey) => prevKey + 1);
  };

  return (
    <div className="App">
      <h1>Gerenciador de Compra e Venda de Acessórios Musicais</h1>

      <SettingsForm
        settings={globalSettings}
        onSettingsChange={setGlobalSettings}
      />

      {/* Passa handleDataChanged para o formulário */}
      <ProductForm
        api={api}
        onProductSaved={handleDataChanged}
        globalSettings={globalSettings}
      />

      {/* Passa handleDataChanged E a key para a lista */}
      <ProductList
        api={api}
        key={refreshKey}
        onDataChanged={handleDataChanged}
      />
    </div>
  );
}

export default App;