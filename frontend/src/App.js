import React from "react";
import ProductForm from "./components/ProductForm";
import ProductList from "./components/ProductList";
import Simulation from "./components/Simulation";
import api from "./api";

function App() {
  return (
    <div className="App">
      <h1>Gerenciador de Compra e Venda de Acessórios Musicais</h1>
      <ProductForm api={api} />
      <ProductList api={api} />
      <Simulation />
    </div>
  );
}

export default App;
