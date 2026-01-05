// src/controllers/FuncionarioController.js
const db = require('../config/db');
const { keysToCamel } = require('../utils/converter');
const xlsx = require('xlsx');
const fs = require('fs');

exports.importarExcel = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Ler o arquivo
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const dados = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Esperamos um Excel com colunas: NOME, RA, EMPRESA, SETOR

        let contagem = 0;

        for (const linha of dados) {
            // Normaliza dados
            const nomeFunc = linha.NOME;
            const ra = String(linha.RA).trim(); // Converte pra string pra evitar erro
            const nomeEmpresa = linha.EMPRESA;
            const nomeSetor = linha.SETOR;

            if (!ra || !nomeFunc) continue; // Pula linhas vazias

            // A. Achar ou Criar Empresa
            let [emp] = await connection.execute('SELECT id FROM empresas WHERE nome = ?', [nomeEmpresa]);
            let empresaId;

            if (emp.length === 0) {
                const [resEmp] = await connection.execute('INSERT INTO empresas (nome) VALUES (?)', [nomeEmpresa]);
                empresaId = resEmp.insertId;
            } else {
                empresaId = emp[0].id;
            }

            // B. Achar ou Criar Setor (Vinculado à Empresa)
            let [set] = await connection.execute('SELECT id FROM setores WHERE nome = ? AND empresa_id = ?', [nomeSetor, empresaId]);
            let setorId;

            if (set.length === 0) {
                const [resSet] = await connection.execute('INSERT INTO setores (nome, empresa_id) VALUES (?, ?)', [nomeSetor, empresaId]);
                setorId = resSet.insertId;
                // Nota: Setor novo criado sem janela de horário definida. Admin terá que configurar depois.
            } else {
                setorId = set[0].id;
            }

            // C. Inserir ou Atualizar Funcionário
            // Se o RA já existe, atualizamos o setor (caso ele tenha mudado de área)
            await connection.execute(`
                INSERT INTO funcionarios (nome, ra_cpf, setor_id, ativo)
                VALUES (?, ?, ?, true)
                ON DUPLICATE KEY UPDATE nome = VALUES(nome), setor_id = VALUES(setor_id)
            `, [nomeFunc, ra, setorId]);

            contagem++;
        }

        await connection.commit();

        // Apaga o arquivo temporário
        fs.unlinkSync(req.file.path);

        res.json({ message: `Processamento concluído! ${contagem} funcionários processados.` });

    } catch (error) {
        await connection.rollback();
        console.error(`[API] ${error}`);
        res.status(500).json({ message: 'Erro ao processar arquivo Excel.' });
    } finally {
        connection.release();
    }
};

exports.listarFuncionarios = async (req, res) => {
    const { empresaId, setorId, busca } = req.query;

    try {
        let query = `
            SELECT
                f.id, f.nome, f.ra_cpf, f.ativo, f.data_nascimento,
                e.id as empresa_id, e.nome as empresa_nome,
                s.id as setor_id, s.nome as setor_nome
            FROM funcionarios f
            JOIN setores s ON f.setor_id = s.id
            JOIN empresas e ON s.empresa_id = e.id
            WHERE 1=1
        `;

        const params = [];

        if (empresaId) {
            query += ' AND e.id = ?';
            params.push(empresaId);
        }
        if (setorId) {
            query += ' AND s.id = ?';
            params.push(setorId);
        }
        if (busca) {
            query += ' AND (f.nome LIKE ? OR f.ra_cpf LIKE ?)';
            params.push(`%${busca}%`, `%${busca}%`);
        }

        query += ' ORDER BY f.nome ASC';

        const [rows] = await db.execute(query, params);
        res.json(keysToCamel(rows));

    } catch (error) {
        console.error(`[API] ${error}`);
        res.status(500).json({ message: 'Erro ao listar funcionários' });
    }
};

// --- CADASTRO MANUAL ---
exports.salvarManual = async (req, res) => {
    const { id, nome, raCpf, setorId, dataNascimento } = req.body;

    try {
        if (id) {
            // Edição
            await db.execute(`
                UPDATE funcionarios
                SET nome=?, ra_cpf=?, setor_id=?, data_nascimento=?
                WHERE id=?
            `, [nome, raCpf, setorId, dataNascimento || null, id]);
        } else {
            // Criação
            await db.execute(`
                INSERT INTO funcionarios (nome, ra_cpf, setor_id, data_nascimento, ativo)
                VALUES (?, ?, ?, ?, true)
            `, [nome, raCpf, setorId, dataNascimento || null]);
        }
        res.json({ message: 'Salvo com sucesso!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Já existe um funcionário com este RA/CPF.' });
        }
        console.error(`[API] ${error}`);
        res.status(500).json({ message: 'Erro ao salvar.' });
    }
};

// --- ALTERAR STATUS (ATIVO/INATIVO) ---
exports.toggleStatus = async (req, res) => {
    const { id, ativo } = req.body;
    try {
        await db.execute('UPDATE funcionarios SET ativo = ? WHERE id = ?', [ativo, id]);
        res.json({ message: 'Status alterado.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao alterar status.' });
    }
};

// --- EXCLUIR DEFINITIVAMENTE ---
exports.excluir = async (req, res) => {
    const { id } = req.params;
    try {
        // Cuidado: Se tiver pedidos, vai dar erro de chave estrangeira (o que é bom para segurança)
        // Se quiser permitir excluir mesmo com pedidos, teria que apagar os pedidos antes.
        // Por segurança, vamos deixar o banco bloquear se tiver histórico.
        await db.execute('DELETE FROM funcionarios WHERE id = ?', [id]);
        res.json({ message: 'Funcionário excluído.' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'Não é possível excluir: Este funcionário já tem pedidos registrados. Apenas inative-o.' });
        }
        res.status(500).json({ message: 'Erro ao excluir.' });
    }
};
