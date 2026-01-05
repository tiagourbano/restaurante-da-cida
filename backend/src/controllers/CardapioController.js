// src/controllers/CardapioController.js
const db = require('../config/db');

exports.salvarCardapio = async (req, res) => {
    const { dataServico, pratoPrincipal, guarnicoes } = req.body;

    try {
        // A lógica ON DUPLICATE KEY UPDATE permite salvar ou atualizar na mesma query
        // Verifique se a coluna 'data_servico' no banco possui índice UNIQUE (nós não criamos explicitamente como unique no script inicial, vamos garantir isso na query de busca antes)

        // 1. Verifica se já existe
        const [existente] = await db.execute('SELECT id FROM cardapios WHERE data_servico = ?', [dataServico]);

        if (existente.length > 0) {
            // Atualiza
            await db.execute(`
                UPDATE cardapios SET prato_principal = ?, guarnicoes = ?
                WHERE id = ?
            `, [pratoPrincipal, guarnicoes, existente[0].id]);
            return res.json({ message: 'Cardápio atualizado com sucesso!' });
        } else {
            // Cria Novo
            await db.execute(`
                INSERT INTO cardapios (data_servico, prato_principal, guarnicoes)
                VALUES (?, ?, ?)
            `, [dataServico, pratoPrincipal, guarnicoes]);
            return res.status(201).json({ message: 'Cardápio cadastrado!' });
        }

    } catch (error) {
        console.error(`[API] ${error}`);
        res.status(500).json({ message: 'Erro ao salvar cardápio.' });
    }
};