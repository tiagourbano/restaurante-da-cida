const express = require('express');
const multer = require('multer');


const upload = multer({ dest: 'uploads/' }); // Pasta temporária
const router = express.Router();

// public controllers
const AuthController = require('./controllers/AuthController');
const PedidoController = require('./controllers/PedidoController');

// admin controllers
const authMiddleware = require('./middlewares/authMiddleware');
const AdminController = require('./controllers/AdminController');
const CardapioController = require('./controllers/CardapioController');
const FuncionarioController = require('./controllers/FuncionarioController');
const SetorController = require('./controllers/SetorController');
const RelatorioController = require('./controllers/RelatorioController');
const EmpresaController = require('./controllers/EmpresaController');
const GerencialController = require('./controllers/GerencialController');

// Rotas Publicas (Considerando que está numa intranet/rede fechada)
router.post('/login', AuthController.login);
router.get('/dados-pedido', PedidoController.getDadosIniciais); // Front chama ao carregar a tela
router.post('/pedido', PedidoController.criarPedido);

router.post('/admin/login', AuthController.loginAdmin);
router.get('/admin/pedidos', authMiddleware, AdminController.getPedidosDoDia);
router.get('/admin/pedidos/:id', authMiddleware, AdminController.getDetalhesPedido);
router.put('/admin/pedidos/:id', authMiddleware, AdminController.atualizarPedido);
router.get('/admin/resumo', authMiddleware, AdminController.getResumoProducao);
router.post('/admin/cardapio', authMiddleware, CardapioController.salvarCardapio);
router.get('/admin/funcionarios', authMiddleware, FuncionarioController.listarFuncionarios);
router.post('/admin/funcionarios', authMiddleware, FuncionarioController.salvarManual);
router.patch('/admin/funcionarios/status', authMiddleware, FuncionarioController.toggleStatus);
router.delete('/admin/funcionarios/:id', authMiddleware, FuncionarioController.excluir);
router.post('/admin/importar-funcionarios', authMiddleware, upload.single('arquivo'), FuncionarioController.importarExcel);
router.get('/admin/setores', authMiddleware, SetorController.listarTodos);
router.post('/admin/setores', authMiddleware, SetorController.salvarSetor);
router.delete('/admin/setores/:id', authMiddleware, SetorController.excluirSetor);
router.get('/admin/setores/horarios', authMiddleware, SetorController.listarComHorarios);
router.post('/admin/setores/horarios', authMiddleware, SetorController.adicionarHorario);
router.delete('/admin/setores/horarios/:id', authMiddleware, SetorController.removerHorario);

router.get('/admin/relatorio', authMiddleware, RelatorioController.gerarRelatorioTela);
router.get('/admin/relatorio/excel', authMiddleware, RelatorioController.exportarExcel);
router.get('/admin/empresas/simples', authMiddleware, EmpresaController.listarEmpresas);

// Empresas
router.get('/admin/empresas', authMiddleware, GerencialController.listarEmpresas);
router.post('/admin/empresas', authMiddleware, GerencialController.salvarEmpresa);
router.patch('/admin/empresas/status', authMiddleware, GerencialController.toggleEmpresa);

// Tamanhos
router.get('/admin/tamanhos', authMiddleware, GerencialController.listarTamanhos);
router.post('/admin/tamanhos', authMiddleware, GerencialController.salvarTamanho);
router.patch('/admin/tamanhos/status', authMiddleware, GerencialController.toggleTamanho);

// Opções
router.get('/admin/opcoes', authMiddleware, GerencialController.listarOpcoes);
router.post('/admin/opcoes', authMiddleware, GerencialController.salvarOpcao);
router.patch('/admin/opcoes/status', authMiddleware, GerencialController.toggleOpcao);

// Cardápios (Histórico)
router.get('/admin/cardapios', authMiddleware, GerencialController.listarCardapiosRecentes);
router.get('/admin/cardapios-mes', authMiddleware, GerencialController.listarCardapiosPorMes);

module.exports = router;