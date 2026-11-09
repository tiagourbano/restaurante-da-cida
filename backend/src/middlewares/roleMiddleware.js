// src/middlewares/roleMiddleware.js
/**
 * Middleware para validar se o usuário autenticado possui o perfil necessário.
 * @param  {...string} rolesPermitidas Lista de papéis autorizados (ex: 'ADMIN', 'CLIENTE')
 */
module.exports = (...rolesPermitidas) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ message: 'Acesso não autenticado.' });
        }

        if (!rolesPermitidas.includes(req.usuario.perfil)) {
            return res.status(403).json({
                message: 'Acesso negado: seu perfil não tem permissão para realizar esta ação.'
            });
        }

        return next();
    };
};
