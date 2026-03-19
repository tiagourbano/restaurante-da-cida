// src/controllers/PedidoController.js
const db = require('../config/db');
const { keysToCamel } = require('../utils/converter');

// --- FUNÇÃO AUXILIAR DE VERIFICAÇÃO ---
async function verificarPermissaoHorario(setorId) {
    // 1. Pega a hora atual do Brasil (HH:MM)
    const agora = new Date().toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit'
    });
    // agora será algo como "11:50"

    // 2. Busca janelas desse setor
    const [janelas] = await db.execute(
        'SELECT hora_inicio, hora_fim FROM janelas_pedidos WHERE setor_id = ?',
        [setorId]
    );

    // Se não tiver nenhuma janela cadastrada, assumimos que está BLOQUEADO (segurança)
    // Ou se preferir liberar geral, mude para return { permitido: true }
    if (janelas.length === 0) {
        return { permitido: false, motivo: 'Seu setor não possui horários cadastrados.' };
    }

    // 3. Verifica se "agora" está dentro de ALGUMA janela
    // Comparação de string "HH:MM" funciona bem (ex: "11:50" > "07:00" e "11:50" < "13:00")
    const dentroDoHorario = janelas.some(j => {
        // Formata o que vem do banco para garantir HH:MM (as vezes vem HH:MM:SS)
        const inicio = j.hora_inicio.slice(0, 5);
        const fim = j.hora_fim.slice(0, 5);
        return agora >= inicio && agora <= fim;
    });

    if (!dentroDoHorario) {
        // Monta string legível dos horários para avisar o usuário
        const horariosLegiveis = janelas.map(j => `&bull; ${j.hora_inicio.slice(0,5)} às ${j.hora_fim.slice(0,5)}`).join('<br />');
        return {
            permitido: false,
            motivo: `Horário encerrado.<br />
                Seu setor só pode pedir das:<br />
                ${horariosLegiveis}.
            `
        };
    }

    return { permitido: true };
}

// Helper para pegar hora atual como Objeto Date, mas ajustado para SP
const getAgoraSP = () => {
    // Cria uma string no formato ISO baseada no fuso de SP
    const strData = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    return new Date(strData);
};

// Função para pegar a data/hora atual de SP no formato MySQL
const getDataHoraSP = () => {
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'America/Sao_Paulo'
  }).replace('T', ' ');
};

// Quando tinha apenas uma opção por funcionario
// Ou seja, quando o funcionario entrava e pedia a marmita do dia apenas
exports.getDadosIniciaisSemPulo = async (req, res) => {
    const { setorId, funcionarioId } = req.query;

    if (!setorId) {
        return res.status(400).json({ message: 'Setor não informado.' });
    }

    try {
        // 1. VERIFICAÇÃO DE HORÁRIO ANTES DE TUDO
        const check = await verificarPermissaoHorario(setorId);
        if (!check.permitido) {
            return res.status(403).json({
                bloqueio: true, // Flag para o frontend saber que é bloqueio de hora
                message: check.motivo
            });
        }

        const [setorRows] = await db.execute(
            'SELECT hora_corte_visualizacao FROM setores WHERE id = ?',
            [setorId]
        );

        // Default: Só vira o dia à meia-noite (23:59) se não tiver configuração
        const horaCorteStr = (setorRows[0]?.hora_corte_visualizacao) || '23:59:59';

        const agora = getAgoraSP();
        const horaAtualStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        let dataAlvo = agora;

        // Se a hora atual já passou do corte (ex: agora é 22:00 e o corte é 17:00)
        // Então o funcionário já deve ver o cardápio de AMANHÃ.
        if (horaAtualStr >= horaCorteStr) {
            // Adiciona 1 dia
            dataAlvo.setDate(dataAlvo.getDate() + 1);
        }

        const dataAlvoFormatada = dataAlvo.toISOString().split('T')[0];

        if (funcionarioId) {
            // Verifica se existe pedido para este funcionário na data do cardápio alvo
            // A comparação usa a coluna 'data_pedido' (se ela salva datetime, precisamos comparar DATE(data_pedido))
            // Mas cuidado: sua lógica atual salva a dataPedidoSP no INSERT.
            // O ideal é checar se existe um pedido vinculado ao CARDÁPIO daquele dia.

            // Vamos buscar pelo cardápio do dia
            const [cardapioDoDia] = await db.execute('SELECT id FROM cardapios WHERE data_servico = ?', [dataAlvoFormatada]);

            if (cardapioDoDia.length > 0) {
                const cardapioId = cardapioDoDia[0].id;

                const [pedidoExistente] = await db.execute(
                    'SELECT id FROM pedidos WHERE funcionario_id = ? AND cardapio_id = ?',
                    [funcionarioId, cardapioId]
                );

                if (pedidoExistente.length > 0) {
                    return res.status(403).json({
                        bloqueio: true, // Reutilizamos a flag de bloqueio visual
                        message: `Você já realizou seu pedido para ${dataAlvo.toLocaleDateString('pt-BR')}!<br>Para alterar, ligue para o restaurante (35) 99884-2001.`
                    });
                }
            }
        }

        // 4. BUSCAR CARDÁPIO (Usando a dataAlvo)
        const [cardapio] = await db.execute('SELECT * FROM cardapios WHERE data_servico = ?', [dataAlvoFormatada]);
        const [tamanhos] = await db.execute('SELECT * FROM tamanhos_marmita WHERE ativo = TRUE');
        const [opcoes] = await db.execute('SELECT * FROM opcoes_extras WHERE ativo = TRUE ORDER BY ordem_exibicao ASC');

        if (cardapio.length === 0) {
            // Ajuste na mensagem para ficar claro qual dia estamos procurando
            const diaFormatado = dataAlvo.toLocaleDateString('pt-BR');
            return res.status(404).json({ message: `Ainda não há cardápio cadastrado para ${diaFormatado}.` });
        }

        const resposta = keysToCamel({
            cardapio: cardapio[0],
            tamanhos,
            opcoes
        });

        res.json(resposta);
    } catch (error) {
        console.error(`[API] ${error}`);
        res.status(500).json({ message: 'Erro ao buscar dados.' });
    }
};

exports.criarPedidoUnico = async (req, res) => {
    const { funcionarioId, cardapioId, tamanhoId, observacao, opcoesEscolhidasIds } = req.body;

    const connection = await db.getConnection();

    try {
        // 0. BUSCAR O SETOR DO FUNCIONARIO PARA VALIDAR DE NOVO (Segurança Backend)
        const [funcData] = await connection.execute('SELECT setor_id FROM funcionarios WHERE id = ?', [funcionarioId]);
        if (funcData.length === 0) throw new Error('Funcionário inválido');

        const check = await verificarPermissaoHorario(funcData[0].setor_id);
        if (!check.permitido) {
            return res.status(403).json({ message: check.motivo });
        }

        // ... (Restante da lógica de transação continua igual) ...
        await connection.beginTransaction();

        const dataPedidoSP = getDataHoraSP();

        const [resultPedido] = await connection.execute(`
            INSERT INTO pedidos (funcionario_id, cardapio_id, tamanho_id, observacao, data_pedido)
            VALUES (?, ?, ?, ?, ?)
        `, [funcionarioId, cardapioId, tamanhoId, observacao, dataPedidoSP]);

        // ... (continua inserção de opcionais e commit)
        const pedidoId = resultPedido.insertId;
        if (opcoesEscolhidasIds && opcoesEscolhidasIds.length > 0) {
            for (const opcaoId of opcoesEscolhidasIds) {
                await connection.execute(`INSERT INTO pedido_opcoes_escolhidas (pedido_id, opcao_extra_id) VALUES (?, ?)`, [pedidoId, opcaoId]);
            }
        }
        await connection.commit();
        res.status(201).json(keysToCamel({ message: 'Pedido realizado!', pedidoId }));

    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Você já fez um pedido hoje! Para alterar, ligue para o restaurante (35) 99884-2001.' });
        console.error(`[API] ${error}`);
        res.status(500).json({ message: error.message || 'Erro ao salvar pedido.' });
    } finally {
        connection.release();
    }
};

// Agora alguns usuarios podem escolher mais de uma marmita
// Ou seja, eles podem escolher a marmita do dia e a marmita de alguns dias para frente.
exports.getDadosIniciais = async (req, res) => {
    const { setorId, funcionarioId } = req.query;

    if (!setorId || !funcionarioId) {
        return res.status(400).json({ message: 'Setor ou Funcionário não informados.' });
    }

    try {
        // 1. VERIFICAÇÃO DE HORÁRIO (Mantido)
        const check = await verificarPermissaoHorario(setorId);
        if (!check.permitido) {
            return res.status(403).json({ bloqueio: true, message: check.motivo });
        }

        // 2. BUSCA REGRAS DO SETOR E FUNCIONÁRIO
        const [setorRows] = await db.execute('SELECT hora_corte_visualizacao FROM setores WHERE id = ?', [setorId]);
        const horaCorteStr = (setorRows[0]?.hora_corte_visualizacao) || '23:59:00';

        const [funcRows] = await db.execute(
            'SELECT pedido_duplo_ativo, dia_semana_liberacao, pulo_dias_marmita_1, pulo_dias_marmita_2 FROM funcionarios WHERE id = ?',
            [funcionarioId]
        );
        const configFunc = funcRows[0];

        // 3. CALCULA A DATA BASE (Com base na hora de corte)
        const agora = getAgoraSP();
        const horaAtualStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        let dataBase = new Date(agora);
        if (horaAtualStr >= horaCorteStr) {
            dataBase.setDate(dataBase.getDate() + 1);
        }

        // 4. LÓGICA DO PEDIDO DUPLO
        let datasAlvoFormatadas = []; // Array que vai guardar as datas que precisamos buscar
        const diaSemanaAtual = agora.getDay(); // 0 a 6 (No JS, Domingo é 0)

        // Se o funcionário tem a flag ativa E hoje é o dia liberado para ele pedir dobrado
        if (configFunc.pedido_duplo_ativo && configFunc.dia_semana_liberacao === diaSemanaAtual) {

            // Calcula Data 1
            let d1 = new Date(dataBase);
            d1.setDate(d1.getDate() + (configFunc.pulo_dias_marmita_1 || 0));
            datasAlvoFormatadas.push(d1.toISOString().split('T')[0]);

            // Calcula Data 2
            let d2 = new Date(dataBase);
            d2.setDate(d2.getDate() + (configFunc.pulo_dias_marmita_2 || 2));
            datasAlvoFormatadas.push(d2.toISOString().split('T')[0]);

        } else {
            // Fluxo Normal (Só 1 dia)
            datasAlvoFormatadas.push(dataBase.toISOString().split('T')[0]);
        }

        // 5. BUSCAR CARDÁPIOS
        // Usamos IN (?) para buscar múltiplos de uma vez. O mysql2 requer uns truques para array
        const placeholders = datasAlvoFormatadas.map(() => '?').join(',');
        const [cardapios] = await db.execute(`SELECT * FROM cardapios WHERE data_servico IN (${placeholders}) ORDER BY data_servico ASC`, datasAlvoFormatadas);

        // 6. VERIFICAR DUPLICIDADE
        // Precisamos saber, para cada cardápio encontrado, se o cara já pediu.
        const cardapiosIds = cardapios.map(c => c.id);
        let pedidosFeitos = [];

        if (cardapiosIds.length > 0) {
            const placeholdersIds = cardapiosIds.map(() => '?').join(',');
            const [pedidosExistentes] = await db.execute(
                `SELECT cardapio_id FROM pedidos WHERE funcionario_id = ? AND cardapio_id IN (${placeholdersIds})`,
                [funcionarioId, ...cardapiosIds]
            );
            pedidosFeitos = pedidosExistentes.map(p => p.cardapio_id);
        }

        // Filtra os cardápios removendo os que ele já pediu
        const cardapiosDisponiveis = cardapios.filter(c => !pedidosFeitos.includes(c.id));

        // Se não sobrou nenhum cardápio disponível (ou porque não tem cadastrado, ou porque já pediu tudo)
        if (cardapiosDisponiveis.length === 0) {
            if (pedidosFeitos.length > 0) {
                 return res.status(403).json({
                    bloqueio: true,
                    message: `Você já realizou todos os seus pedidos liberados para hoje!<br>Para alterar, ligue para o restaurante.`
                });
            } else {
                return res.status(404).json({ message: `Ainda não há cardápio cadastrado para a(s) data(s) calculada(s).` });
            }
        }

        // 7. BUSCA TAMANHOS E OPÇÕES (Mantido)
        const [tamanhos] = await db.execute('SELECT * FROM tamanhos_marmita WHERE ativo = TRUE');
        const [opcoes] = await db.execute('SELECT * FROM opcoes_extras WHERE ativo = TRUE ORDER BY ordem_exibicao ASC');

        // 8. O PULO DO GATO: RETORNAR OS CARDÁPIOS
        const resposta = keysToCamel({
            // Agora retornamos um ARRAY de cardápios disponíveis
            cardapiosDisponiveis: cardapiosDisponiveis,
            tamanhos,
            opcoes
        });

        res.json(resposta);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar dados.' });
    }
};

// Logo a funcao criar pedido tem que ser capaz de receber 1 ou mais pedidos.
exports.criarPedido = async (req, res) => {
    // 1. Prepara os dados para serem sempre um Array (Mesmo que o front mande só 1 pedido)
    let pedidosParaSalvar = [];

    // Se vier um array direto no body (novo formato)
    if (Array.isArray(req.body)) {
        pedidosParaSalvar = req.body;
    }
    // Se vier um objeto único (formato antigo/retrocompatibilidade)
    else if (req.body.funcionarioId && req.body.cardapioId) {
        pedidosParaSalvar = [req.body];
    }
    else {
        return res.status(400).json({ message: 'Dados do pedido inválidos.' });
    }

    if (pedidosParaSalvar.length === 0) {
        return res.status(400).json({ message: 'Nenhum pedido enviado.' });
    }

    const connection = await db.getConnection();

    try {
        // 2. VALIDAÇÃO DE SEGURANÇA (Usa o funcionarioId do primeiro pedido)
        const funcionarioId = pedidosParaSalvar[0].funcionarioId;
        const [funcData] = await connection.execute('SELECT setor_id FROM funcionarios WHERE id = ?', [funcionarioId]);

        if (funcData.length === 0) throw new Error('Funcionário inválido');

        const check = await verificarPermissaoHorario(funcData[0].setor_id);
        if (!check.permitido) {
            return res.status(403).json({ message: check.motivo });
        }

        // 3. INICIA A TRANSAÇÃO (Tudo ou Nada)
        await connection.beginTransaction();

        const dataPedidoSP = getDataHoraSP();
        const pedidosGeradosIds = [];

        // 4. LOOP DE SALVAMENTO
        for (const p of pedidosParaSalvar) {
            // Insere o pedido principal
            const [resultPedido] = await connection.execute(`
                INSERT INTO pedidos (funcionario_id, cardapio_id, tamanho_id, observacao, data_pedido)
                VALUES (?, ?, ?, ?, ?)
            `, [p.funcionarioId, p.cardapioId, p.tamanhoId, p.observacao || '', dataPedidoSP]);

            const pedidoId = resultPedido.insertId;
            pedidosGeradosIds.push(pedidoId);

            // Insere os opcionais (se houver)
            if (p.opcoesEscolhidasIds && p.opcoesEscolhidasIds.length > 0) {
                for (const opcaoId of p.opcoesEscolhidasIds) {
                    await connection.execute(
                        `INSERT INTO pedido_opcoes_escolhidas (pedido_id, opcao_extra_id) VALUES (?, ?)`,
                        [pedidoId, opcaoId]
                    );
                }
            }
        }

        // 5. EFETIVA A TRANSAÇÃO
        await connection.commit();
        res.status(201).json(keysToCamel({
            message: pedidosParaSalvar.length > 1 ? 'Pedidos realizados!' : 'Pedido realizado!',
            pedidosIds: pedidosGeradosIds
        }));

    } catch (error) {
        await connection.rollback();
        // Se der erro de chave duplicada (ER_DUP_ENTRY) na tabela de pedidos
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Um ou mais pedidos já foram realizados para estas datas! Para alterar, ligue para o restaurante.' });
        }
        console.error(`[API] Erro ao salvar pedido: ${error}`);
        res.status(500).json({ message: error.message || 'Erro ao salvar pedido(s).' });
    } finally {
        connection.release();
    }
};