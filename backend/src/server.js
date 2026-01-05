const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors()); // Permite que o Vue acesse a API
app.use(express.json()); // Permite receber JSON

// Rotas
app.use('/api', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[API] Servidor rodando na porta ${PORT}`);
});