// src/middlewares/funcionarioAuthMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Acesso não autorizado: token de funcionário não fornecido.' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ message: 'Formato de token inválido.' });
    }

    const token = parts[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err || decoded.tipo !== 'FUNCIONARIO') {
            return res.status(401).json({ message: 'Sessão de funcionário inválida ou expirada. Faça login novamente.' });
        }

        req.funcionario = {
            id: decoded.id,
            setorId: decoded.setorId,
            empresaId: decoded.empresaId,
            nome: decoded.nome,
            raCpf: decoded.raCpf
        };

        return next();
    });
};
