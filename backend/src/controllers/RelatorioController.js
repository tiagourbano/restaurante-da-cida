const db = require('../config/db');
const excel = require('exceljs');
const { keysToCamel } = require('../utils/converter');

// --- Lógica Comum: Busca e Agrupa Dados ---
async function buscarDadosAgrupados(filtros, usuario) {
    const { empresaId, setorId, dataInicio, dataFim } = filtros;
    const { perfil, empresaId: usuarioEmpresaId } = usuario;

    let query = `
        SELECT
            p.id, p.data_pedido,
            f.nome as funcionario_nome,
            e.nome as empresa_nome, e.id as empresa_id,
            s.nome as setor_nome, s.id as setor_id,
            t.nome as tamanho_nome, t.preco,
            -- Subquery para pegar opcionais concatenados
            (
                SELECT GROUP_CONCAT(oe.nome SEPARATOR ', ')
                FROM pedido_opcoes_escolhidas poe
                JOIN opcoes_extras oe ON poe.opcao_extra_id = oe.id
                WHERE poe.pedido_id = p.id
            ) as extras
        FROM pedidos p
        JOIN funcionarios f ON p.funcionario_id = f.id
        JOIN setores s ON f.setor_id = s.id
        JOIN empresas e ON s.empresa_id = e.id
        JOIN tamanhos_marmita t ON p.tamanho_id = t.id
        JOIN cardapios c ON p.cardapio_id = c.id
        WHERE 1=1
    `;

    const params = [];

    // Aplica Filtros Dinâmicos
    if (perfil === 'CLIENTE') {
        // Se for cliente, FORÇA o filtro da empresa dele
        query += ' AND e.id = ?';
        params.push(usuarioEmpresaId);
    } else if (empresaId) { query += ' AND e.id = ?'; params.push(empresaId); }
    if (setorId)   { query += ' AND s.id = ?'; params.push(setorId); }
    if (dataInicio){ query += ' AND c.data_servico >= ?'; params.push(dataInicio); }
    if (dataFim)   { query += ' AND c.data_servico <= ?'; params.push(dataFim); }


    // ORDENAÇÃO É CRUCIAL PARA O AGRUPAMENTO FUNCIONAR
    query += ' ORDER BY e.nome, s.nome, c.data_servico, f.nome';

    const [rows] = await db.execute(query, params);

    // --- ALGORITMO DE AGRUPAMENTO (A Árvore) ---
    // Estrutura: Array de Empresas -> Setores -> Dias -> Pedidos
    const relatorio = [];

    rows.forEach(row => {
        // Converter preço para numero
        const preco = parseFloat(row.preco);
        const dataFormatada = new Date(row.data_pedido).toLocaleDateString('pt-BR');

        // 1. Nível Empresa
        let empresaObj = relatorio.find(e => e.id === row.empresa_id);
        if (!empresaObj) {
            empresaObj = {
                id: row.empresa_id,
                nome: row.empresa_nome,
                setores: [],
                totalValor: 0,
                totalQtd: 0
            };
            relatorio.push(empresaObj);
        }

        // 2. Nível Setor
        let setorObj = empresaObj.setores.find(s => s.id === row.setor_id);
        if (!setorObj) {
            setorObj = {
                id: row.setor_id,
                nome: row.setor_nome,
                dias: [],
                totalValor: 0,
                totalQtd: 0
            };
            empresaObj.setores.push(setorObj);
        }

        // 3. Nível Dia
        let diaObj = setorObj.dias.find(d => d.data === dataFormatada);
        if (!diaObj) {
            diaObj = {
                data: dataFormatada,
                pedidos: [],
                totalValor: 0,
                totalQtd: 0
            };
            setorObj.dias.push(diaObj);
        }

        // 4. Adicionar Pedido e Somar Totais Recursivamente
        diaObj.pedidos.push({
            funcionario: row.funcionario_nome,
            tamanho: row.tamanho_nome,
            extras: row.extras || '-',
            preco: preco
        });

        // Somar Totais (Dia, Setor, Empresa)
        diaObj.totalValor += preco;
        diaObj.totalQtd++;

        setorObj.totalValor += preco;
        setorObj.totalQtd++;

        empresaObj.totalValor += preco;
        empresaObj.totalQtd++;
    });

    return relatorio;
}

// --- ROTA 1: JSON para Tela ---
exports.gerarRelatorioTela = async (req, res) => {
    try {
        const dados = await buscarDadosAgrupados(req.query, req.usuario);
        res.json(keysToCamel(dados));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao gerar relatório' });
    }
};

// --- ROTA 2: Exportar Excel ---
exports.exportarExcel = async (req, res) => {
    try {
        const dados = await buscarDadosAgrupados(req.query, req.usuario);

        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Fechamento');

        // Configuração de Colunas
        worksheet.columns = [
            { header: 'Detalhe / Funcionário', key: 'col1', width: 40 },
            { header: 'Tamanho', key: 'col2', width: 15 },
            { header: 'Extras/Obs', key: 'col3', width: 30 },
            { header: 'Valor (R$)', key: 'col4', width: 15 },
        ];

        // Iterar sobre a árvore para desenhar as linhas
        dados.forEach(emp => {
            // Cabeçalho Empresa (Azul Escuro)
            const rowEmp = worksheet.addRow([`EMPRESA: ${emp.nome}`, '', '', `R$ ${emp.totalValor.toFixed(2)}`]);
            rowEmp.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
            rowEmp.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };

            emp.setores.forEach(setor => {
                // Cabeçalho Setor (Azul Claro)
                const rowSet = worksheet.addRow([`  SETOR: ${setor.nome}`, '', '', `R$ ${setor.totalValor.toFixed(2)}`]);
                rowSet.font = { bold: true, size: 12 };
                rowSet.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };

                setor.dias.forEach(dia => {
                    // Cabeçalho Dia (Cinza)
                    const rowDia = worksheet.addRow([`    DATA: ${dia.data}`, '', '', `Total: R$ ${dia.totalValor.toFixed(2)}`]);
                    rowDia.font = { italic: true, bold: true };
                    rowDia.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEDED' } };

                    // Pedidos Individuais
                    dia.pedidos.forEach(p => {
                        worksheet.addRow([
                            `      ${p.funcionario}`,
                            p.tamanho,
                            p.extras,
                            p.preco
                        ]);
                    });
                });
            });
            // Linha em branco para separar empresas
            worksheet.addRow([]);
        });

        // Configurar Headers de resposta para download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=fechamento_marmitas.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao gerar Excel');
    }
};