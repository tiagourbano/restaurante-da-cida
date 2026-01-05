const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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
        console.error(`[API] ${error}`);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

exports.loginAdmin = async (req, res) => {
    const { login, password } = req.body;

    try {
        // 1. Busca o usuário pelo login
        const [rows] = await db.execute(
            'SELECT * FROM usuarios_sistema WHERE login = ? AND ativo = TRUE',
            [login]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        const usuario = rows[0];

        // 2. Compara a senha digitada com a hash do banco
        const senhaBate = await bcrypt.compare(password, usuario.senha);

        if (!senhaBate) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        // 3. Gera o Token com as permissões
        const token = jwt.sign({
            id: usuario.id,
            nome: usuario.nome,
            perfil: usuario.perfil,       // 'ADMIN' ou 'CLIENTE'
            empresaId: usuario.empresa_id // ID da empresa ou NULL
        }, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });

        // Retorna dados para o frontend saber o que mostrar
        res.json({
            token,
            usuario: {
                nome: usuario.nome,
                perfil: usuario.perfil,
                empresaId: usuario.empresa_id
            }
        });

    } catch (error) {
        console.error(`[API] ${error}`);
        res.status(500).json({ message: 'Erro ao realizar login.' });
    }
};

// --- ROTA TEMPORÁRIA PARA VOCÊ CRIAR O PRIMEIRO ADMIN ---
// Apague ou comente essa função depois de usar!
exports.criarAdminInicial = async (req, res) => {
    const senhaHash = await bcrypt.hash('123456', 10); // Senha padrão: 123456
    try {
        await db.execute(
            `INSERT INTO usuarios_sistema (nome, login, senha, perfil) VALUES (?, ?, ?, ?)`,
            ['Admin Inicial', 'admin', senhaHash, 'ADMIN']
        );
        res.json({ message: 'Admin criado com senha "123456"' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};