const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const routes = require('./routes');
const logger = require('./config/logger');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors()); // Permite que o Vue acesse a API
app.use(express.json()); // Permite receber JSON

// --- 1. CONFIGURAÇÃO DE LOG DE ACESSO (MORGAN) ---
// Usamos o "stream" do morgan para jogar os dados para o nosso logger winston
const morganFormat = ':method :url :status :res[content-length] - :response-time ms';

app.use(morgan(morganFormat, {
  stream: {
    write: (message) => {
      // Remove a quebra de linha do final e loga como 'http'
      logger.info(message.trim(), { type: 'http-access' });
    },
  },
}));

// --- 2. ENDPOINT PARA RECEBER LOGS DO FRONTEND ---
app.post('/api/logs-frontend', (req, res) => {
  const { level, message, stack, info, userAgent } = req.body;

  // Loga no backend identificando que veio do front
  logger.log({
    level: level || 'info', // error, warn, info
    message: `[FRONTEND] ${message}`,
    stack: stack,
    vueInfo: info,
    userAgent: userAgent,
    service: 'marmita-da-cida-frontend' // Sobrescreve o service default pra filtrar no Loki
  });

  res.status(200).send({ received: true });
});

// Rotas
app.use('/api', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[API] Servidor rodando na porta ${PORT}`);
});