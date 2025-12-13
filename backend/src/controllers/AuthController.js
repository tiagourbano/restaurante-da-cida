const jwt = require('jsonwebtoken');

const db = require('../config/db');
const { keysToCamel } = require('../utils/converter'); // <--- Importou

exports.login = async (req, res) => {
    const { raCpf } = req.body; // <--- Esperamos camelCase na entrada também (opcional)
    // Nota: Se o front enviar 'raCpf', precisamos converter para 'ra_cpf' ou usar direto na query se for parametro simples.
    // Para simplificar, vou assumir que o valor chega na variavel e passamos pro SQL.

    try {
        const [rows] = await db.execute(`
            SELECT
                f.id, f.nome, f.ra_cpf,
                s.id as setor_id, s.nome as setor_nome,
                e.id as empresa_id, e.nome as empresa_nome, e.trabalha_fim_semana
            FROM funcionarios f
            INNER JOIN setores s ON f.setor_id = s.id
            INNER JOIN empresas e ON s.empresa_id = e.id
            WHERE f.ra_cpf = ? AND f.ativo = TRUE
        `, [raCpf]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Funcionário não encontrado.' });
        }

        const funcionarioRaw = rows[0];

        // Validação de Fim de Semana (Lógica mantida)
        const hoje = new Date();
        const diaSemana = hoje.getDay();
        const isFimDeSemana = (diaSemana === 0 || diaSemana === 6);

        if (isFimDeSemana && !funcionarioRaw.trabalha_fim_semana) {
            return res.status(403).json({
                bloqueio: true,
                message: 'Empresa fechada para pedidos no fim de semana.'
            });
        }

        // A MÁGICA ACONTECE AQUI
        // O banco retornou: { empresa_id: 1, trabalha_fim_semana: 0 }
        // O front recebe: { empresaId: 1, trabalhaFimSemana: 0 }
        const funcionarioFormatado = keysToCamel(funcionarioRaw);

        res.json(funcionarioFormatado);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

exports.loginAdmin = async (req, res) => {
    const { password } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Senha incorreta.' });
    }

    // Gera o token que expira em 24h
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, {
        expiresIn: '1d'
    });

    res.json({ token });
};