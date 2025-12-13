// src/controllers/AdminController.js
const db = require('../config/db');
const { keysToCamel } = require('../utils/converter');

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
        console.error(error);
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
        console.error(error);
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