const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
app.use(cors());

// Tratamento blindado para recuperar a chave privada de qualquer formato corrompido pelo Render
let rawKey = process.env.GOOGLE_PRIVATE_KEY || '';

// Limpa aspas extras se houver e conserta quebras de linha (seja \n literal ou espaços)
let formattedKey = rawKey.trim().replace(/^["'](.+)["']$/, '$1');

if (formattedKey.includes('\\n')) {
  formattedKey = formattedKey.replace(/\\n/g, '\n');
} else if (!formattedKey.includes('\n')) {
  // Se o Render transformou as quebras em espaços, reconstrói o formato PEM do zero
  const body = formattedKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, ''); // Remove todos os espaços do miolo em base64

  // Recria o bloco padrão com quebras a cada 64 caracteres
  const chunkedBody = body.match(/.{1,64}/g).join('\n');
  formattedKey = `-----BEGIN PRIVATE KEY-----\n${chunkedBody}\n-----END PRIVATE KEY-----\n`;
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: formattedKey,
    project_id: process.env.GOOGLE_PROJECT_ID,
  },
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

// Rota para buscar subpastas (compatível com o seu index.html)
// Rota para buscar subpastas
app.get('/api/folders/:folderId', async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'name',
    });
    res.json(response.data.files);
  } catch (error) {
    console.error("Erro ao buscar pastas:", error);
    // Devolve o erro exato do Google para vermos na tela
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Rota para buscar músicas
app.get('/api/tracks/:folderId', async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'audio/' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'name',
    });
    res.json(response.data.files);
  } catch (error) {
    console.error("Erro ao buscar músicas:", error);
    res.status(500).json({ error: error.message, stack: error.stack });
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
