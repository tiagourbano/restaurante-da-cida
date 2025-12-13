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

// Função para pegar a data/hora atual de SP no formato MySQL
const getDataHoraSP = () => {
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'America/Sao_Paulo'
  }).replace('T', ' ');
};


// --- CONTROLLERS ATUALIZADOS ---

exports.getDadosIniciais = async (req, res) => {
    // PRECISASMOS RECEBER O SETOR ID AGORA
    const { setorId } = req.query;

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

        // ... (Restante do código continua igual) ...
        const hoje = new Date().toISOString().split('T')[0];
        const [cardapio] = await db.execute('SELECT * FROM cardapios WHERE data_servico = ?', [hoje]);
        const [tamanhos] = await db.execute('SELECT * FROM tamanhos_marmita WHERE ativo = TRUE');
        const [opcoes] = await db.execute('SELECT * FROM opcoes_extras WHERE ativo = TRUE ORDER BY ordem_exibicao ASC');

        if (cardapio.length === 0) {
            return res.status(404).json({ message: 'Nenhum cardápio cadastrado para hoje.' });
        }

        const resposta = keysToCamel({
            cardapio: cardapio[0],
            tamanhos,
            opcoes
        });

        res.json(resposta);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar dados.' });
    }
};

exports.criarPedido = async (req, res) => {
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
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Você já fez um pedido hoje! Para alterar, ligue para o restaurante.' });
        console.error(error);
        res.status(500).json({ message: error.message || 'Erro ao salvar pedido.' });
    } finally {
        connection.release();
    }
};