import React, { useState } from "react";

function ProductForm({ api }) {
  const [form, setForm] = useState({
    nome: "",
    preco_compra: "",
    preco_venda: "",
    peso: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post("/produtos", form);
    alert("Produto cadastrado!");
  };

  return (
    <div>
      <h2>Cadastrar Produto</h2>
      <form onSubmit={handleSubmit}>
        <input name="nome" placeholder="Nome" value={form.nome} onChange={handleChange} />
        <input name="preco_compra" type="number" placeholder="Preço de compra" value={form.preco_compra} onChange={handleChange} />
        <input name="preco_venda" type="number" placeholder="Preço de venda" value={form.preco_venda} onChange={handleChange} />
        <input name="peso" type="number" placeholder="Peso (kg)" value={form.peso} onChange={handleChange} />
        <button type="submit">Salvar</button>
      </form>
    </div>
  );
}

export default ProductForm;
