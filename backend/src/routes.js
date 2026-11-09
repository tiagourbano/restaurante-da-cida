const express = require('express');
const multer = require('multer');


const upload = multer({ dest: 'uploads/' }); // Pasta temporária
const router = express.Router();

// public controllers
const AuthController = require('./controllers/AuthController');
const PedidoController = require('./controllers/PedidoController');

// middlewares
const authMiddleware = require('./middlewares/authMiddleware');
const funcionarioAuthMiddleware = require('./middlewares/funcionarioAuthMiddleware');
const requireRole = require('./middlewares/roleMiddleware');

// admin controllers
const AdminController = require('./controllers/AdminController');
const CardapioController = require('./controllers/CardapioController');
const FuncionarioController = require('./controllers/FuncionarioController');
const SetorController = require('./controllers/SetorController');
const RelatorioController = require('./controllers/RelatorioController');
const EmpresaController = require('./controllers/EmpresaController');
const GerencialController = require('./controllers/GerencialController');
const UsuarioController = require('./controllers/UsuarioController');

router.get('/health', (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Rotas de Funcionários / Pedidos
router.post('/login', AuthController.login);
router.get('/dados-pedido', funcionarioAuthMiddleware, PedidoController.getDadosIniciais);
router.post('/pedido', funcionarioAuthMiddleware, PedidoController.criarPedido);

router.get('/setup-admin', AuthController.criarAdminInicial);
router.get('/setup-admin/senha', AuthController.gerarSenhaCriptografada);
router.post('/admin/login', AuthController.loginAdmin);
// Rotas Administrativas de Pedidos e Expedição (Apenas ADMIN)
router.get('/admin/pedidos', authMiddleware, requireRole('ADMIN'), AdminController.getPedidosDoDia);
router.patch('/admin/pedidos/etiquetas-lote', authMiddleware, requireRole('ADMIN'), AdminController.atualizarStatusEtiquetasLote);
router.patch('/admin/pedidos/:id/etiqueta', authMiddleware, requireRole('ADMIN'), AdminController.atualizarStatusEtiqueta);
router.get('/admin/pedidos/:id', authMiddleware, requireRole('ADMIN'), AdminController.getDetalhesPedido);
router.put('/admin/pedidos/:id', authMiddleware, requireRole('ADMIN'), AdminController.atualizarPedido);
router.delete('/admin/pedidos/:id', authMiddleware, requireRole('ADMIN'), AdminController.excluirPedido);
router.post('/admin/pedidos', authMiddleware, requireRole('ADMIN'), AdminController.criarPedidoManual);
router.get('/admin/resumo', authMiddleware, requireRole('ADMIN'), AdminController.getResumoProducao);

// Cardápios (Apenas ADMIN)
router.post('/admin/cardapio', authMiddleware, requireRole('ADMIN'), CardapioController.salvarCardapio);
router.get('/admin/cardapios', authMiddleware, requireRole('ADMIN'), GerencialController.listarCardapiosRecentes);
router.get('/admin/cardapios-mes', authMiddleware, requireRole('ADMIN'), GerencialController.listarCardapiosPorMes);

// Funcionários (ADMIN e CLIENTE)
router.get('/admin/funcionarios', authMiddleware, requireRole('ADMIN', 'CLIENTE'), FuncionarioController.listarFuncionarios);
router.post('/admin/funcionarios', authMiddleware, requireRole('ADMIN', 'CLIENTE'), FuncionarioController.salvarManual);
router.patch('/admin/funcionarios/status', authMiddleware, requireRole('ADMIN', 'CLIENTE'), FuncionarioController.toggleStatus);
router.delete('/admin/funcionarios/:id', authMiddleware, requireRole('ADMIN', 'CLIENTE'), FuncionarioController.excluir);
router.post('/admin/importar-funcionarios', authMiddleware, requireRole('ADMIN'), upload.single('arquivo'), FuncionarioController.importarExcel);

// Setores e Horários (Apenas ADMIN para gestão estrutural)
router.get('/admin/setores', authMiddleware, requireRole('ADMIN', 'CLIENTE'), SetorController.listarTodos);
router.post('/admin/setores', authMiddleware, requireRole('ADMIN'), SetorController.salvarSetor);
router.delete('/admin/setores/:id', authMiddleware, requireRole('ADMIN'), SetorController.excluirSetor);
router.get('/admin/setores/horarios', authMiddleware, requireRole('ADMIN'), SetorController.listarComHorarios);
router.post('/admin/setores/horarios', authMiddleware, requireRole('ADMIN'), SetorController.adicionarHorario);
router.delete('/admin/setores/horarios/:id', authMiddleware, requireRole('ADMIN'), SetorController.removerHorario);

// Relatórios e Empresas simples (ADMIN e CLIENTE)
router.get('/admin/relatorio', authMiddleware, requireRole('ADMIN', 'CLIENTE'), RelatorioController.gerarRelatorioTela);
router.get('/admin/relatorio/excel', authMiddleware, requireRole('ADMIN', 'CLIENTE'), RelatorioController.exportarExcel);
router.get('/admin/empresas/simples', authMiddleware, requireRole('ADMIN', 'CLIENTE'), EmpresaController.listarEmpresas);

// Empresas CRUD (Apenas ADMIN)
router.get('/admin/empresas', authMiddleware, requireRole('ADMIN'), GerencialController.listarEmpresas);
router.post('/admin/empresas', authMiddleware, requireRole('ADMIN'), GerencialController.salvarEmpresa);
router.patch('/admin/empresas/status', authMiddleware, requireRole('ADMIN'), GerencialController.toggleEmpresa);

// Tamanhos (Apenas ADMIN)
router.get('/admin/tamanhos', authMiddleware, requireRole('ADMIN'), GerencialController.listarTamanhos);
router.post('/admin/tamanhos', authMiddleware, requireRole('ADMIN'), GerencialController.salvarTamanho);
router.patch('/admin/tamanhos/status', authMiddleware, requireRole('ADMIN'), GerencialController.toggleTamanho);

// Opções (Apenas ADMIN)
router.get('/admin/opcoes', authMiddleware, requireRole('ADMIN'), GerencialController.listarOpcoes);
router.post('/admin/opcoes', authMiddleware, requireRole('ADMIN'), GerencialController.salvarOpcao);
router.patch('/admin/opcoes/status', authMiddleware, requireRole('ADMIN'), GerencialController.toggleOpcao);
router.delete('/admin/opcoes/:id', authMiddleware, requireRole('ADMIN'), GerencialController.excluirOpcao);

// Usuários do Sistema (Apenas ADMIN)
router.get('/admin/usuarios', authMiddleware, requireRole('ADMIN'), UsuarioController.listarUsuarios);
router.post('/admin/usuarios', authMiddleware, requireRole('ADMIN'), UsuarioController.salvarUsuario);
router.patch('/admin/usuarios/status', authMiddleware, requireRole('ADMIN'), UsuarioController.toggleStatus);
router.delete('/admin/usuarios/:id', authMiddleware, requireRole('ADMIN'), UsuarioController.excluirUsuario);

module.exports = router;