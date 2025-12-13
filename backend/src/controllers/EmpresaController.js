const db = require('../config/db');
const { keysToCamel } = require('../utils/converter');

exports.listarEmpresas = async (req, res) => {
    try {
        // Busca setores e horários (LEFT JOIN para trazer setores mesmo sem horário configurado)
        const [rows] = await db.execute(`
            SELECT
                e.id,
                e.nome
            FROM empresas e
            WHERE e.ativo = 1
            ORDER BY e.nome
        `);

        res.json(keysToCamel(rows));

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao listar empresas' });
    }
};
