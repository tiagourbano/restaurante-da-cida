const db = require('../config/db');
const { keysToCamel } = require('../utils/converter');

exports.listarComHorarios = async (req, res) => {
    try {
        // Busca setores e horários (LEFT JOIN para trazer setores mesmo sem horário configurado)
        const [rows] = await db.execute(`
            SELECT
                s.id as setor_id,
                s.nome as setor_nome,
                s.hora_corte_visualizacao,
                e.nome as empresa_nome,
                e.id as empresa_id,
                jp.id as janela_id,
                jp.hora_inicio,
                jp.hora_fim,
                jp.descricao
            FROM setores s
            JOIN empresas e ON s.empresa_id = e.id
            LEFT JOIN janelas_pedidos jp ON s.id = jp.setor_id
            ORDER BY e.nome, s.nome, jp.hora_inicio
        `);

        // Agrupamento manual (Transformar lista chata em árvore)
        const mapaSetores = new Map();

        rows.forEach(row => {
            if (!mapaSetores.has(row.setor_id)) {
                mapaSetores.set(row.setor_id, {
                    id: row.setor_id,
                    nome: row.setor_nome,
                    empresaNome: row.empresa_nome,
                    empresaId: row.empresa_id,
                    horarios: []
                });
            }

            if (row.janela_id) { // Se tiver horário, adiciona no array
                mapaSetores.get(row.setor_id).horarios.push({
                    id: row.janela_id,
                    horaInicio: row.hora_inicio, // Vem como 'HH:MM:SS'
                    horaFim: row.hora_fim,
                    descricao: row.descricao
                });
            }
        });

        // Converte Map para Array
        const resposta = Array.from(mapaSetores.values());
        res.json(keysToCamel(resposta));

    } catch (error) {
        console.error(`[API] ${error}`);
        res.status(500).json({ message: 'Erro ao listar setores' });
    }
};

exports.adicionarHorario = async (req, res) => {
    const { setorId, horaInicio, horaFim, descricao } = req.body;
    try {
        await db.execute(`
            INSERT INTO janelas_pedidos (setor_id, hora_inicio, hora_fim, descricao)
            VALUES (?, ?, ?, ?)
        `, [setorId, horaInicio, horaFim, descricao]);

        res.status(201).json({ message: 'Horário adicionado!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar horário' });
    }
};

exports.removerHorario = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM janelas_pedidos WHERE id = ?', [id]);
        res.json({ message: 'Horário removido!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover horário' });
    }
};

// --- NOVO: LISTAGEM SIMPLES PARA O CRUD ---
exports.listarTodos = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                s.id,
                s.nome,
                s.empresa_id,
                s.hora_corte_visualizacao,
                e.nome as empresa_nome
            FROM setores s
            JOIN empresas e ON s.empresa_id = e.id
            ORDER BY e.nome, s.nome
        `);
        res.json(keysToCamel(rows));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar setores' });
    }
};

// --- NOVO: SALVAR (CRIAR / EDITAR) ---
exports.salvarSetor = async (req, res) => {
    const { id, nome, empresaId, horaCorteVisualizacao } = req.body;

    if (!nome || !empresaId) {
        return res.status(400).json({ message: 'Nome e Empresa são obrigatórios.' });
    }

    try {
        if (id) {
            // Edição
            await db.execute(
                'UPDATE setores SET nome = ?, empresa_id = ?, hora_corte_visualizacao = ? WHERE id = ?',
                [nome, empresaId, horaCorteVisualizacao || '23:59:59', id]
            );
        } else {
            // Criação
            await db.execute(
                'INSERT INTO setores (nome, empresa_id, hora_corte_visualizacao) VALUES (?, ?, ?)',
                [nome, empresaId, horaCorteVisualizacao || '23:59:59']
            );
        }
        res.json({ message: 'Setor salvo com sucesso!' });
    } catch (error) {
        console.error(`[API] ${error}`);
        res.status(500).json({ message: 'Erro ao salvar setor.' });
    }
};

// --- NOVO: EXCLUIR ---
exports.excluirSetor = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM setores WHERE id = ?', [id]);
        res.json({ message: 'Setor excluído.' });
    } catch (error) {
        // Erro comum: O setor tem funcionários ou horários vinculados
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({
                message: 'Não é possível excluir: Existem funcionários ou horários vinculados a este setor.'
            });
        }
        res.status(500).json({ message: 'Erro ao excluir setor.' });
    }
};