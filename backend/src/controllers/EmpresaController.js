const db = require('../config/db');
const { keysToCamel } = require('../utils/converter');

exports.listarEmpresas = async (req, res) => {
    try {
        const params = [];
        let query = `
            SELECT
                e.id,
                e.nome
            FROM empresas e
            WHERE e.ativo = 1
        `;

        if (req.usuario.perfil === 'CLIENTE') {
            query += ` AND e.id = ? `;
            params.push(req.usuario.empresaId);
        }

        query += ` ORDER BY e.nome`;

        const [rows] = await db.execute(query, params);

        res.json(keysToCamel(rows));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao listar empresas' });
    }
};
