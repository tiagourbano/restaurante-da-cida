const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const http = require('http');

const { register, startEventLoopMonitor } = require('./config/metrics');
const routes = require('./routes');
const logger = require('./config/logger');

require('dotenv').config();

const app = express();
startEventLoopMonitor();

// Middlewares
app.use(cors());
app.use(express.json());

// --- LOG DE ACESSO ---
const morganFormat = ':method :url :status :res[content-length] - :response-time ms';

app.use(morgan(morganFormat, {
  stream: {
    write: (message) => {
      logger.info(message.trim(), { type: 'http-access' });
    },
  },
}));

// --- HEALTHCHECK (importante para docker) ---
app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

// --- LOGS DO FRONTEND ---
app.post('/api/logs-frontend', (req, res) => {
  const { level, message, stack, info, userAgent } = req.body;

  logger.log({
    level: level || 'info',
    message: `[FRONTEND] ${message}`,
    stack: stack,
    vueInfo: info,
    userAgent: userAgent,
    service: 'marmita-da-cida-frontend'
  });

  res.status(200).send({ received: true });
});

app.use((req, res, next) => {
  res.setTimeout(60000, () => {
    logger.error('Request timeout', { url: req.originalUrl });
    res.status(503).send('timeout');
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Rotas
app.use('/api', routes);

const PORT = process.env.PORT || 3000;

// cria server manual
const server = http.createServer(app);

// timeouts importantes
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 15000;

server.listen(PORT, () => {
  console.log(`[API] Servidor rodando na porta ${PORT}`);
});