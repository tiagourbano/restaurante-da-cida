// src/config/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info', // Loga tudo de info pra cima (info, warn, error)
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json() // <--- O PULO DO GATO: JSON para o Loki parsear fácil
  ),
  defaultMeta: { service: 'marmita-da-cida-backend' }, // Tag para saber de onde veio no Grafana
  transports: [
    new winston.transports.Console() // Escreve no STDOUT/STDERR
  ],
});

module.exports = logger;