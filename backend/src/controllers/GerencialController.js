const db = require('../config/db');
const { keysToCamel } = require('../utils/converter');

// --- EMPRESAS ---
exports.listarEmpresas = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM empresas ORDER BY nome');
        res.json(keysToCamel(rows));
    } catch (e) { res.status(500).json({ error: 'Erro ao listar' }); }
};

exports.salvarEmpresa = async (req, res) => {
    const { id, nome, trabalhaFimSemana } = req.body;
    try {
        if (id) {
            await db.execute('UPDATE empresas SET nome=?, trabalha_fim_semana=? WHERE id=?', [nome, trabalhaFimSemana, id]);
        } else {
            await db.execute('INSERT INTO empresas (nome, trabalha_fim_semana) VALUES (?, ?)', [nome, trabalhaFimSemana]);
        }
        res.json({ message: 'Salvo com sucesso' });
    } catch (e) { res.status(500).json({ error: 'Erro ao salvar' }); }
};

exports.toggleEmpresa = async (req, res) => {
    const { id, ativo } = req.body; // Recebe o novo estado
    try {
        await db.execute('UPDATE empresas SET ativo = ? WHERE id = ?', [ativo, id]);
        res.json({ message: 'Status atualizado' });
    } catch (e) { res.status(500).json({ error: 'Erro ao atualizar status' }); }
};

// --- TAMANHOS ---
exports.listarTamanhos = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM tamanhos_marmita ORDER BY nome');
        res.json(keysToCamel(rows));
    } catch (e) { res.status(500).json({ error: 'Erro ao listar' }); }
};

exports.salvarTamanho = async (req, res) => {
    const { id, nome, preco } = req.body;
    try {
        if (id) {
            await db.execute('UPDATE tamanhos_marmita SET nome=?, preco=? WHERE id=?', [nome, preco, id]);
        } else {
            await db.execute('INSERT INTO tamanhos_marmita (nome, preco) VALUES (?, ?)', [nome, preco]);
        }
        res.json({ message: 'Salvo com sucesso' });
    } catch (e) { res.status(500).json({ error: 'Erro ao salvar' }); }
};

exports.toggleTamanho = async (req, res) => {
    const { id, ativo } = req.body;
    try {
        await db.execute('UPDATE tamanhos_marmita SET ativo = ? WHERE id = ?', [ativo, id]);
        res.json({ message: 'Status atualizado' });
    } catch (e) { res.status(500).json({ error: 'Erro' }); }
};

// --- OPÇÕES EXTRAS ---
exports.listarOpcoes = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM opcoes_extras ORDER BY tipo, ordem_exibicao');
        res.json(keysToCamel(rows));
    } catch (e) { res.status(500).json({ error: 'Erro ao listar' }); }
};

exports.salvarOpcao = async (req, res) => {
    const { id, nome, tipo, ordemExibicao } = req.body;
    try {
        if (id) {
            await db.execute('UPDATE opcoes_extras SET nome=?, tipo=?, ordem_exibicao=? WHERE id=?', [nome, tipo, ordemExibicao, id]);
        } else {
            await db.execute('INSERT INTO opcoes_extras (nome, tipo, ordem_exibicao) VALUES (?, ?, ?)', [nome, tipo, ordemExibicao]);
        }
        res.json({ message: 'Salvo com sucesso' });
    } catch (e) { res.status(500).json({ error: 'Erro ao salvar' }); }
};

exports.toggleOpcao = async (req, res) => {
    const { id, ativo } = req.body;
    try {
        await db.execute('UPDATE opcoes_extras SET ativo = ? WHERE id = ?', [ativo, id]);
        res.json({ message: 'Status atualizado' });
    } catch (e) { res.status(500).json({ error: 'Erro' }); }
};

exports.excluirOpcao = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM opcoes_extras WHERE id = ?', [id]);
        res.json({ message: 'Opção excluída.' });
    } catch (e) {
        res.status(500).json({ message: 'Erro ao excluir.' });
    }
};

// --- CARDÁPIO (Listar dias cadastrados) ---
exports.listarCardapiosRecentes = async (req, res) => {
    try {
        // Traz os últimos 30 dias para ela editar se precisar
        const [rows] = await db.execute(`
            SELECT * FROM cardapios
            ORDER BY data_servico DESC LIMIT 30
        `);
        res.json(keysToCamel(rows));
    } catch (e) { res.status(500).json({ error: 'Erro ao listar' }); }
};

// Buscar cardápios de um mês específico
exports.listarCardapiosPorMes = async (req, res) => {
    const { mes, ano } = req.query; // ex: mes=12, ano=2025

    try {
        const [rows] = await db.execute(`
            SELECT * FROM cardapios
            WHERE MONTH(data_servico) = ? AND YEAR(data_servico) = ?
        `, [mes, ano]);

        res.json(keysToCamel(rows));
    } catch (e) {
        res.status(500).json({ error: 'Erro ao buscar cardápios do mês' });
    }
};
