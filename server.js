const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config(); // Adicione esta linha no topo!

const app = express();
app.use(cors());

// --- NOVA CONFIGURAÇÃO SEGURA ---
// As credenciais agora vêm das variáveis de ambiente (invisíveis no código)
const credentials = {
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  // O .replace é necessário para que as quebras de linha (\n) do arquivo .env sejam lidas corretamente pelo Google
  private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  project_id: process.env.GOOGLE_PROJECT_ID
};

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });

app.get('/api/folders/:folderId', async (req, res) => {
  try {
    const folderId = req.params.folderId;
    // Busca apenas arquivos cujo mimeType seja de uma PASTA
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'name' // Organiza em ordem alfabética
    });
    res.json(response.data.files);
  } catch (error) {
    console.error("Erro ao carregar pastas:", error);
    res.status(500).json({ error: 'Erro ao carregar diretórios.' });
  }
});

app.get('/api/tracks/:folderId', async (req, res) => {
  try {
    const folderId = req.params.folderId;
    // Busca apenas arquivos de áudio
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'audio/' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'name'
    });
    res.json(response.data.files);
  } catch (error) {
    console.error("Erro ao carregar músicas:", error);
    res.status(500).json({ error: 'Erro ao carregar músicas do Drive.' });
  }
});

app.get('/api/stream/:fileId', async (req, res) => {
  try {
    const response = await drive.files.get(
      { fileId: req.params.fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    // Configura os headers para aceitar avançar/retroceder na linha do tempo
    res.setHeader('Accept-Ranges', 'bytes');
    response.data.pipe(res);
  } catch (error) {
    console.error("Erro no streaming:", error);
    res.status(500).send('Falha ao reproduzir áudio.');
  }
});

app.listen(3000, () => {
  console.log('Servidor robusto da Rádio a correr em http://localhost:3000');
});
