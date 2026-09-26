const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
app.use(cors());

// Autenticação via Conta de Serviço usando Variáveis de Ambiente do Render
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    project_id: process.env.GOOGLE_PROJECT_ID,
  },
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

// Rota principal: Retorna tanto as subpastas quanto as músicas da pasta atual
app.get('/api/contents/:folderId', async (req, res) => {
  try {
    const folderId = req.params.folderId;

    // 1. Buscar Subpastas
    const foldersResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'name',
    });

    // 2. Buscar Músicas (Áudios)
    const tracksResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'audio/' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'name',
    });

    res.json({
      folders: foldersResponse.data.files,
      tracks: tracksResponse.data.files,
    });
  } catch (error) {
    console.error("Erro ao buscar conteúdos do Drive:", error);
    res.status(500).json({ error: 'Erro ao carregar pasta do Drive.' });
  }
});

// Rota de Streaming de Áudio
app.get('/api/stream/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    res.setHeader('Content-Type', 'audio/mpeg');
    response.data.pipe(res);
  } catch (error) {
    console.error("Erro no streaming:", error);
    res.status(500).send('Falha ao reproduzir áudio.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor robusto da Rádio a correr na porta ${PORT}`);
});
