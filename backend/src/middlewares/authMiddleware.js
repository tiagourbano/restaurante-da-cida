// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Token não fornecido.' });

    const parts = authHeader.split(' ');
    if (parts.length !== 2) return res.status(401).json({ message: 'Erro no Token.' });
    const [scheme, token] = parts;

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Token inválido.' });

        // INJETAMOS OS DADOS NO REQUEST
        req.usuario = {
            id: decoded.id,
            perfil: decoded.perfil,
            empresaId: decoded.empresaId
        };

        return next();
    });
};