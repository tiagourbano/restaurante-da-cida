// src/controllers/AdminController.js
const db = require('../config/db');
const { keysToCamel } = require('../utils/converter');

const getDataHoraSP = () => {
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'America/Sao_Paulo'
  }).replace('T', ' ');
};

exports.getPedidosDoDia = async (req, res) => {
    // Se quiser filtrar por data específica, pegue do query param. Se não, usa hoje.
    const dataFiltro = req.query.data || new Date().toISOString().split('T')[0];

    try {
        // Essa query usa GROUP_CONCAT para juntar as opções (ex: "Sem Feijão, Ovo Frito") em uma string só, facilitando a exibição.
        const [rows] = await db.execute(`
            SELECT
                p.id as pedido_id,
                p.data_pedido,
                p.observacao,
                t.nome as tamanho_nome,
                f.nome as funcionario_nome,
                s.nome as setor_nome,
                e.id as empresa_id,
                e.nome as empresa_nome,
                CASE
                    WHEN f.data_nascimento IS NOT NULL
                         AND MONTH(f.data_nascimento) = MONTH(c.data_servico)
                         AND DAY(f.data_nascimento) = DAY(c.data_servico)
                    THEN 1
                    ELSE 0
                END as is_aniversariante,

                -- Agrupa nomes das opções separando por vírgula
                (
                    SELECT GROUP_CONCAT(oe.nome SEPARATOR ' + ')
                    FROM pedido_opcoes_escolhidas poe
                    JOIN opcoes_extras oe ON poe.opcao_extra_id = oe.id
                    WHERE poe.pedido_id = p.id
                ) as opcoes_escolhidas_string

            FROM pedidos p
            JOIN funcionarios f ON p.funcionario_id = f.id
            JOIN setores s ON f.setor_id = s.id
            JOIN empresas e ON s.empresa_id = e.id
            JOIN cardapios c ON p.cardapio_id = c.id
            JOIN tamanhos_marmita t ON p.tamanho_id = t.id
            WHERE c.data_servico = ?
            ORDER BY e.nome, s.nome, f.nome
        `, [dataFiltro]);

        // Retorna dados formatados
        res.json(keysToCamel(rows));

    } catch (error) {
        console.error(`[API] ${error}`);
        res.status(500).json({ message: 'Erro ao buscar relatórios.' });
    }
};

// Rota para o Resumo de Produção (Totais para a cozinha)
exports.getResumoProducao = async (req, res) => {
    const dataFiltro = req.query.data || new Date().toISOString().split('T')[0];

    try {
        // 1. Contagem por Tamanho
        const [tamanhos] = await db.execute(`
            SELECT t.nome, COUNT(*) as quantidade
            FROM pedidos p
            JOIN tamanhos_marmita t ON p.tamanho_id = t.id
            JOIN cardapios c ON p.cardapio_id = c.id
            WHERE c.data_servico = ?
            GROUP BY t.nome
        `, [dataFiltro]);

        // 2. Contagem de Trocas e Opcionais (Importante para o cozinheiro saber quantos ovos fritar)
        const [extras] = await db.execute(`
            SELECT oe.nome, COUNT(*) as quantidade
            FROM pedido_opcoes_escolhidas poe
            JOIN pedidos p ON poe.pedido_id = p.id
            JOIN cardapios c ON p.cardapio_id = c.id
            JOIN opcoes_extras oe ON poe.opcao_extra_id = oe.id
            WHERE c.data_servico = ?
            GROUP BY oe.nome
        `, [dataFiltro]);

        res.json(keysToCamel({ tamanhos, extras }));

    } catch (error) {
        console.error(`[API] ${error}`);
        res.status(500).json({ message: 'Erro ao gerar resumo.' });
    }
};

// Adicione este método para pegar os detalhes para edição
exports.getDetalhesPedido = async (req, res) => {
    const { id } = req.params;
    try {
        // Busca dados básicos
        const [pedidos] = await db.execute('SELECT * FROM pedidos WHERE id = ?', [id]);
        if (pedidos.length === 0) return res.status(404).json({ message: 'Pedido não encontrado' });

        // Busca IDs das opções já escolhidas (para marcar os checkboxes)
        const [opcoes] = await db.execute('SELECT opcao_extra_id FROM pedido_opcoes_escolhidas WHERE pedido_id = ?', [id]);

        const resultado = {
            ...pedidos[0],
            opcoesEscolhidasIds: opcoes.map(o => o.opcao_extra_id) // Retorna array simples: [1, 5]
        };

        res.json(keysToCamel(resultado));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar detalhes' });
    }
};

// Adicione este método para ATUALIZAR
exports.atualizarPedido = async (req, res) => {
    const { id } = req.params;
    const { tamanhoId, observacao, opcoesEscolhidasIds } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Atualiza dados básicos
        await connection.execute(`
            UPDATE pedidos SET tamanho_id = ?, observacao = ? WHERE id = ?
        `, [tamanhoId, observacao, id]);

        // 2. Atualiza Opções: O jeito mais fácil é apagar tudo e recriar
        await connection.execute('DELETE FROM pedido_opcoes_escolhidas WHERE pedido_id = ?', [id]);

        if (opcoesEscolhidasIds && opcoesEscolhidasIds.length > 0) {
            for (const opcaoId of opcoesEscolhidasIds) {
                await connection.execute(`
                    INSERT INTO pedido_opcoes_escolhidas (pedido_id, opcao_extra_id) VALUES (?, ?)
                `, [id, opcaoId]);
            }
        }

        await connection.commit();
        res.json({ message: 'Pedido atualizado com sucesso!' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Erro ao atualizar pedido' });
    } finally {
        connection.release();
    }
};

exports.excluirPedido = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Primeiro remove as opções escolhidas (tabela filha)
        await connection.execute('DELETE FROM pedido_opcoes_escolhidas WHERE pedido_id = ?', [id]);

        // Depois remove o pedido em si
        await connection.execute('DELETE FROM pedidos WHERE id = ?', [id]);

        await connection.commit();
        res.json({ message: 'Pedido excluído com sucesso.' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Erro ao excluir pedido.' });
    } finally {
        connection.release();
    }
};

exports.criarPedidoManual = async (req, res) => {
    // Admin manda tudo, inclusive o ID do funcionário
    const { funcionarioId, tamanhoId, observacao, opcoesEscolhidasIds } = req.body;

    const connection = await db.getConnection();

    try {
        // A. Descobrir qual é o Cardápio Ativo (Lógica simplificada: pega o do dia/corte)
        // Como o Admin pode estar pedindo a qualquer hora, vamos assumir que ele quer
        // pedir para o cardápio que está "valendo" agora ou o de amanhã se for tarde.
        // *Melhoria:* Vamos buscar o cardápio baseado na regra de corte do setor do funcionário
        // para garantir que caia no dia certo (produção de hoje ou amanhã).

        const [funcData] = await connection.execute('SELECT setor_id FROM funcionarios WHERE id = ?', [funcionarioId]);
        if (funcData.length === 0) throw new Error('Funcionário não encontrado.');
        const setorId = funcData[0].setor_id;

        // Regra de Corte (Cópia da lógica do PedidoController, mas sem o bloqueio)
        const [setorRows] = await connection.execute('SELECT hora_corte_visualizacao FROM setores WHERE id = ?', [setorId]);
        const horaCorteStr = (setorRows[0]?.hora_corte_visualizacao) || '23:59:00';

        // Data atual SP
        const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const horaAtualStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        let dataAlvo = agora;
        if (horaAtualStr >= horaCorteStr) {
            dataAlvo.setDate(dataAlvo.getDate() + 1);
        }
        const dataAlvoFormatada = dataAlvo.toISOString().split('T')[0];

        // Busca o Cardápio dessa data
        const [cardapios] = await connection.execute('SELECT id FROM cardapios WHERE data_servico = ?', [dataAlvoFormatada]);

        if (cardapios.length === 0) {
            return res.status(400).json({ message: `Não há cardápio cadastrado para a data ${dataAlvoFormatada}.` });
        }
        const cardapioId = cardapios[0].id;

        // B. Verifica Duplicidade (Admin pode querer forçar, mas vamos avisar se já tiver)
        const [existente] = await connection.execute('SELECT id FROM pedidos WHERE funcionario_id = ? AND cardapio_id = ?', [funcionarioId, cardapioId]);
        if (existente.length > 0) {
            return res.status(400).json({ message: 'Este funcionário já tem pedido para esta data.' });
        }

        // C. Salva
        await connection.beginTransaction();
        const dataPedidoSP = getDataHoraSP();

        const [result] = await connection.execute(`
            INSERT INTO pedidos (funcionario_id, cardapio_id, tamanho_id, observacao, data_pedido)
            VALUES (?, ?, ?, ?, ?)
        `, [funcionarioId, cardapioId, tamanhoId, observacao, dataPedidoSP]);

        const pedidoId = result.insertId;

        if (opcoesEscolhidasIds && opcoesEscolhidasIds.length > 0) {
            for (const opId of opcoesEscolhidasIds) {
                await connection.execute('INSERT INTO pedido_opcoes_escolhidas (pedido_id, opcao_extra_id) VALUES (?, ?)', [pedidoId, opId]);
            }
        }

        await connection.commit();
        res.json({ message: 'Pedido criado manualmente!' });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: error.message || 'Erro ao criar pedido manual.' });
    } finally {
        connection.release();
    }
};
