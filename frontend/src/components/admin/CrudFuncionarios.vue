<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import api from '../../services/api';

const lista = ref([]);
const empresas = ref([]);
const setores = ref([]); // Todos os setores do sistema
const loading = ref(false);

// Filtros da Listagem
const filtro = ref({
  empresaId: '',
  setorId: '',
  busca: ''
});

// Formulário de Cadastro
const modalAberto = ref(false);
const form = ref({
  id: null,
  nome: '',
  raCpf: '',
  empresaId: '', // Usado só para filtrar o combo de setores
  setorId: '',
  dataNascimento: ''
});

// --- CARREGAMENTOS ---
const carregarAuxiliares = async () => {
  // Precisamos das listas de empresas e setores para os combos
  const [resEmp, resSet] = await Promise.all([
    api.get('/admin/empresas'),
    api.get('/admin/setores') // Precisamos garantir que essa rota retorne lista simples
  ]);
  empresas.value = resEmp.data;

  // A rota /admin/setores atual retorna hierarquia.
  // O ideal seria ter uma rota simples, mas vamos "achatá-la" aqui se necessário
  // Vou assumir que você vai criar um endpoint simples ou ajustar o retorno.
  // SE SUA ROTA /admin/setores RETORNA A HIERARQUIA, use este código para achatar:
  const setoresPlanos = [];
  resSet.data.forEach(setorOuEmpresa => {
     // Se sua rota retorna o formato hierarquico do passo anterior, ajuste aqui.
     // Se for o formato lista simples, apenas atribua.
     // VOU SUPOR QUE VOCE VAI USAR A ROTA DE HIERARQUIA QUE CRIAMOS:
     if(setorOuEmpresa.horarios) { // É aquele objeto hierárquico
        setoresPlanos.push({
           id: setorOuEmpresa.id,
           nome: setorOuEmpresa.nome,
           empresaNome: setorOuEmpresa.empresaNome,
           // Precisamos do ID da empresa pra filtrar no form.
           // Se a rota hierarquica nao traz o ID da empresa explicito, vamos ter problema.
           // SUGESTÃO: Vamos usar a lista de setores dentro do form filtrando visualmente
        });
     }
  });

  // *AJUSTE RÁPIDO*: Para não complicar, vamos fazer o seguinte:
  // No form, ao selecionar empresa, buscamos os setores dela, ok?
  // Para a listagem, vamos usar o endpoint de listagem.
};

const buscarFuncionarios = async () => {
  loading.value = true;
  try {
    const res = await api.get('/admin/funcionarios', { params: filtro.value });
    lista.value = res.data;
  } catch (error) {
    alert('Erro ao buscar funcionários');
  } finally {
    loading.value = false;
  }
};

// --- AÇÕES DO CRUD ---
const abrirModal = (funcionario = null) => {
  if (funcionario) {
    // Edição
    form.value = {
      id: funcionario.id,
      nome: funcionario.nome,
      raCpf: funcionario.raCpf,
      empresaId: funcionario.empresaId,
      setorId: funcionario.setorId,
      dataNascimento: funcionario.dataNascimento ? funcionario.dataNascimento.split('T')[0] : ''
    };
  } else {
    // Novo
    form.value = { id: null, nome: '', raCpf: '', empresaId: '', setorId: '', dataNascimento: '' };
  }
  modalAberto.value = true;
};

const salvar = async () => {
  if (!form.value.nome || !form.value.raCpf || !form.value.setorId) {
    return alert('Preencha nome, RA e Setor.');
  }

  try {
    await api.post('/admin/funcionarios', form.value);
    modalAberto.value = false;
    buscarFuncionarios();
    alert('Salvo com sucesso!');
  } catch (error) {
    alert(error.response?.data?.message || 'Erro ao salvar.');
  }
};

const toggleStatus = async (func) => {
  await api.patch('/admin/funcionarios/status', { id: func.id, ativo: !func.ativo });
  buscarFuncionarios();
};

const excluir = async (id) => {
  if (!confirm('Tem certeza? Se este funcionário já tiver pedidos, ele não será excluído (apenas inative-o).')) return;
  try {
    await api.delete(`/admin/funcionarios/${id}`);
    buscarFuncionarios();
  } catch (error) {
    alert(error.response?.data?.message || 'Erro ao excluir');
  }
};

// --- COMPUTED PARA O FORMULÁRIO ---
// Para filtrar o combo de setores baseado na empresa selecionada no modal
// Precisamos carregar a lista completa de setores com empresa_id.
// Se não tiver essa rota, teremos que fazer uma gambiarra ou criar a rota.
// Vou assumir que vamos carregar tudo no onMounted.
// ADICIONE ISSO NO GerencialController (Backend) se não tiver: exports.listarTodosSetores = ... SELECT s.id, s.nome, s.empresa_id ...
const todosSetores = ref([]);

const setoresFiltradosNoForm = computed(() => {
  if (!form.value.empresaId) return [];
  return todosSetores.value.filter(s => s.empresaId === form.value.empresaId);
});

onMounted(async () => {
  // Carrega empresas
  const r1 = await api.get('/admin/empresas');
  empresas.value = r1.data;

  // PRECISAMOS DE UMA ROTA QUE LISTE SETORES COM EMPRESA_ID
  // Vou simular chamando a rota de hierarquia e desmontando ela, ou crie uma rota simples.
  // Vamos usar a rota hierarquica /admin/setores e adaptar:
  const r2 = await api.get('/admin/setores');
  // O retorno de /admin/setores (hierarquico) é um array de setores.
  // Se fizemos o `listarComHorarios` ele retorna [{ id, nome, empresaNome, ... }]
  // Mas não retorna o empresaId explicitamente se não colocamos na query.
  // **IMPORTANTE**: Certifique-se que o endpoint /admin/setores retorna o empresaId.
  todosSetores.value = r2.data.map(s => ({
      id: s.id, // ou s.setorId dependendo da sua query anterior
      nome: s.nome || s.setorNome,
      // Aqui precisariamos do ID da empresa.
      // Se não tiver vindo, o filtro do form vai falhar.
      // DICA: No SetorController.js adicione 'e.id as empresa_id' no select do listarComHorarios
      empresaId: s.empresaId || 999
  }));

  buscarFuncionarios();
});

// Utilitario Data
const formatarData = (dataIso) => {
  if (!dataIso) return '-';
  const [ano, mes, dia] = dataIso.split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
};
</script>

<template>
  <div class="crud-funcionarios">
    <h3>Funcionários</h3>

    <div class="filtros-bar no-print">
      <select v-model="filtro.empresaId" @change="buscarFuncionarios">
        <option value="">Todas Empresas</option>
        <option v-for="e in empresas" :key="e.id" :value="e.id">{{ e.nome }}</option>
      </select>

      <input v-model="filtro.busca" placeholder="Buscar por Nome ou RA..." @keyup.enter="buscarFuncionarios">

      <button @click="buscarFuncionarios" class="btn-buscar">🔍 Buscar</button>
      <button @click="abrirModal()" class="btn-novo">+ Novo Funcionário</button>
    </div>

    <table class="tabela">
      <thead>
        <tr>
          <th>Nome</th>
          <th>RA/CPF</th>
          <th>Empresa</th>
          <th>Setor</th>
          <th>Nascimento</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="f in lista" :key="f.id" :class="{ inativo: !f.ativo }">
          <td>{{ f.nome }}</td>
          <td>{{ f.raCpf }}</td>
          <td>{{ f.empresaNome }}</td>
          <td>{{ f.setorNome }}</td>
          <td>
             <span v-if="f.dataNascimento">{{ formatarData(f.dataNascimento) }} 🎂</span>
             <span v-else>-</span>
          </td>
          <td>
            <button @click="toggleStatus(f)" class="btn-status" :class="{ on: f.ativo }">
              {{ f.ativo ? 'Ativo' : 'Inativo' }}
            </button>
          </td>
          <td>
            <button @click="abrirModal(f)" class="btn-edit">✏️</button>
            <button @click="excluir(f.id)" class="btn-trash">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="modalAberto" class="modal-backdrop" @click.self="modalAberto = false">
      <div class="modal-card">
        <h3>{{ form.id ? 'Editar' : 'Novo' }} Funcionário</h3>

        <label>Nome Completo:</label>
        <input v-model="form.nome">

        <label>RA ou CPF (Login):</label>
        <input v-model="form.raCpf">

        <div class="row">
          <div class="col">
            <label>Empresa:</label>
            <select v-model="form.empresaId">
              <option v-for="e in empresas" :key="e.id" :value="e.id">{{ e.nome }}</option>
            </select>
          </div>
          <div class="col">
            <label>Setor:</label>
            <select v-model="form.setorId" :disabled="!form.empresaId">
               <option v-for="s in setoresFiltradosNoForm" :key="s.id" :value="s.id">{{ s.nome }}</option>
            </select>
          </div>
        </div>

        <label>Data de Nascimento (Opcional):</label>
        <input type="date" v-model="form.dataNascimento">

        <div class="acoes-modal">
          <button @click="salvar" class="btn-save">Salvar</button>
          <button @click="modalAberto = false" class="btn-cancel">Cancelar</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.crud-funcionarios { margin-top: 20px; }
.filtros-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
.filtros-bar input, .filtros-bar select { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.btn-buscar { background: #2c3e50; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; }
.btn-novo { background: #42b983; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-left: auto; font-weight: bold; }

.tabela { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.tabela th, .tabela td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
.tabela th { background: #f8f9fa; font-weight: bold; color: #555; }
.inativo { opacity: 0.6; background: #f9f9f9; }

.btn-status { border: 1px solid #ccc; background: #eee; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8em; }
.btn-status.on { background: #e8f5e9; color: green; border-color: #c8e6c9; }

.btn-edit, .btn-trash { border: none; background: none; cursor: pointer; font-size: 1.1em; margin-right: 5px; }
.btn-trash:hover { transform: scale(1.2); }

/* Modal */
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-card { background: white; padding: 25px; border-radius: 8px; width: 500px; display: flex; flex-direction: column; gap: 10px; }
.row { display: flex; gap: 10px; }
.col { flex: 1; display: flex; flex-direction: column; }
.modal-card input, .modal-card select { padding: 10px; border: 1px solid #ccc; border-radius: 5px; margin-bottom: 5px; }
.acoes-modal { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
.btn-save { background: #42b983; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
.btn-cancel { background: #ccc; color: black; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
</style>