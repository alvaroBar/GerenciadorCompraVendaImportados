import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:5000", // ajuste se o backend usar outra porta
});

export default api;
