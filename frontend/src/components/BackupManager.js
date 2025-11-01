// frontend/src/components/BackupManager.js
import React, { useState } from "react";

function BackupManager({ api }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setUploadMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      alert("Por favor, selecione um arquivo .db para enviar.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Envia o arquivo para o backend
      const response = await api.post('/admin/upload-db', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      // Mostra a mensagem de sucesso/aviso do backend
      alert(response.data.message);
      setUploadMessage(response.data.message);
    } catch (error) {
      const errorMsg = error.response?.data?.erro || "Erro ao enviar arquivo.";
      alert(errorMsg);
      setUploadMessage(errorMsg);
    }
  };

  return (
    <div className="backup-manager">
      <h2>Backup e Restauração (Zona de Perigo)</h2>

      <div className="backup-actions">
        {/* --- 1. Ação de Download --- */}
        <div>
          <h3>Baixar Backup</h3>
          <p>Salva uma cópia de segurança do banco de dados atual.</p>
          <a
            href="http://127.0.0.1:5000/admin/download-db"
            className="btn-download"
            download // Força o download
          >
            Baixar Backup do Banco de Dados (.db)
          </a>
        </div>

        {/* --- 2. Ação de Upload --- */}
        <div>
          <h3>Restaurar Backup (Upload)</h3>
          <p><strong>Atenção:</strong> Siga as instruções após o upload.</p>
          <form onSubmit={handleSubmit}>
            <input type="file" accept=".db" onChange={handleFileChange} required />
            <button type_="submit">Enviar Arquivo</button>
          </form>
        </div>
      </div>

      {uploadMessage && <p style={{color: 'red', fontWeight: 'bold', marginTop: '15px'}}>{uploadMessage}</p>}
    </div>
  );
}

export default BackupManager;