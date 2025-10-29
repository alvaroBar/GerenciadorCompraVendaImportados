import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import Modal from 'react-modal'; // 1. Importar

Modal.setAppElement('#root'); // 2. Adicionar esta linha

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);