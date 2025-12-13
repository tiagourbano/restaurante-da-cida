// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // 1. Busca o token no cabeçalho (Authorization: Bearer xxxxx)
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    // O header vem como "Bearer <token>", precisamos pegar só a parte do token
    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
        return res.status(401).json({ message: 'Erro no Token.' });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ message: 'Token malformatado.' });
    }

    // 2. Verifica a validade
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token inválido ou expirado.' });
        }

        // Se deu tudo certo, deixa passar
        req.userId = decoded.id;
        return next();
    });
};