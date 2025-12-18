const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { keysToCamel } = require('../utils/converter');

// --- LISTAR ---
exports.listarUsuarios = async (req, res) => {
    try {
        // Trazemos também o nome da empresa para exibir na tabela
        const [rows] = await db.execute(`
            SELECT
                u.id, u.nome, u.login, u.perfil, u.ativo,
                u.empresa_id,
                e.nome as empresa_nome
            FROM usuarios_sistema u
            LEFT JOIN empresas e ON u.empresa_id = e.id
            ORDER BY u.nome
        `);
        // NÃO RETORNAMOS A SENHA (HASH) POR SEGURANÇA
        res.json(keysToCamel(rows));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar usuários.' });
    }
};

// --- SALVAR (CRIAR / EDITAR) ---
exports.salvarUsuario = async (req, res) => {
    const { id, nome, login, password, perfil, empresaId } = req.body;

    // Regras básicas
    if (!nome || !login || !perfil) {
        return res.status(400).json({ message: 'Preencha nome, login e perfil.' });
    }

    if (perfil === 'CLIENTE' && !empresaId) {
        return res.status(400).json({ message: 'Se o perfil for CLIENTE, selecione uma Empresa.' });
    }

    const connection = await db.getConnection();

    try {
        // Verifica se login já existe (para evitar erro 500 feio)
        const [existente] = await connection.execute('SELECT id FROM usuarios_sistema WHERE login = ? AND id != ?', [login, id || 0]);
        if (existente.length > 0) {
            return res.status(400).json({ message: 'Este login já está em uso.' });
        }

        // Define o valor final de empresa_id (se for ADMIN, força NULL)
        const finalEmpresaId = perfil === 'ADMIN' ? null : empresaId;

        if (id) {
            // --- EDIÇÃO ---
            if (password && password.trim() !== '') {
                // Se digitou senha nova, criptografa e atualiza tudo
                const hash = await bcrypt.hash(password, 10);
                await connection.execute(`
                    UPDATE usuarios_sistema
                    SET nome=?, login=?, senha=?, perfil=?, empresa_id=?
                    WHERE id=?
                `, [nome, login, hash, perfil, finalEmpresaId, id]);
            } else {
                // Se NÃO digitou senha, mantém a antiga
                await connection.execute(`
                    UPDATE usuarios_sistema
                    SET nome=?, login=?, perfil=?, empresa_id=?
                    WHERE id=?
                `, [nome, login, perfil, finalEmpresaId, id]);
            }
        } else {
            // --- CRIAÇÃO ---
            if (!password) return res.status(400).json({ message: 'Senha é obrigatória para novos usuários.' });

            const hash = await bcrypt.hash(password, 10);
            await connection.execute(`
                INSERT INTO usuarios_sistema (nome, login, senha, perfil, empresa_id)
                VALUES (?, ?, ?, ?, ?)
            `, [nome, login, hash, perfil, finalEmpresaId]);
        }

        res.json({ message: 'Usuário salvo com sucesso!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao salvar usuário.' });
    } finally {
        connection.release();
    }
};

// --- TOGGLE STATUS (ATIVAR/INATIVAR) ---
// É mais seguro inativar do que excluir, para manter histórico de logs se tiver no futuro
exports.toggleStatus = async (req, res) => {
    const { id, ativo } = req.body;
    try {
        await db.execute('UPDATE usuarios_sistema SET ativo = ? WHERE id = ?', [ativo, id]);
        res.json({ message: 'Status alterado.' });
    } catch (e) {
        res.status(500).json({ message: 'Erro ao alterar status.' });
    }
};

// --- EXCLUIR (Opcional) ---
exports.excluirUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM usuarios_sistema WHERE id = ?', [id]);
        res.json({ message: 'Usuário excluído.' });
    } catch (e) {
        res.status(500).json({ message: 'Erro ao excluir.' });
    }
};