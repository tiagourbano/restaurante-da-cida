<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../../services/api';

const lista = ref([]);
const empresas = ref([]);
const loading = ref(false);

const modalAberto = ref(false);
const editando = ref(false);

const form = ref({
  id: null,
  nome: '',
  login: '',
  password: '', // Senha não criptografada (input)
  perfil: 'CLIENTE', // Default
  empresaId: ''
});

// Carregar Dados
const carregar = async () => {
  loading.value = true;
  try {
    const [resUsers, resEmpresas] = await Promise.all([
       api.get('/admin/usuarios'),
       api.get('/admin/empresas')
    ]);
    lista.value = resUsers.data;
    empresas.value = resEmpresas.data;
  } catch (error) {
    alert('Erro ao carregar usuários.');
  } finally {
    loading.value = false;
  }
};

const abrirModal = (user = null) => {
  if (user) {
    editando.value = true;
    // Copia os dados, mas deixa a senha vazia (só preenche se quiser trocar)
    form.value = {
       id: user.id,
       nome: user.nome,
       login: user.login,
       password: '',
       perfil: user.perfil,
       empresaId: user.empresaId || ''
    };
  } else {
    editando.value = false;
    form.value = { id: null, nome: '', login: '', password: '', perfil: 'CLIENTE', empresaId: '' };
  }
  modalAberto.value = true;
};

const salvar = async () => {
  // Validações simples frontend
  if (!form.value.nome || !form.value.login) return alert('Preencha nome e login.');
  if (!editando.value && !form.value.password) return alert('Crie uma senha inicial.');
  if (form.value.perfil === 'CLIENTE' && !form.value.empresaId) return alert('Selecione a empresa para este cliente.');

  try {
    await api.post('/admin/usuarios', form.value);
    modalAberto.value = false;
    carregar();
    alert('Usuário salvo!');
  } catch (error) {
    alert(error.response?.data?.message || 'Erro ao salvar.');
  }
};

const toggleStatus = async (user) => {
  await api.patch('/admin/usuarios/status', { id: user.id, ativo: !user.ativo });
  carregar();
};

const excluir = async (id) => {
  if (!confirm('Tem certeza?')) return;
  try {
    await api.delete(`/admin/usuarios/${id}`);
    carregar();
  } catch (error) {
    alert('Erro ao excluir.');
  }
};

onMounted(carregar);
</script>

<template>
  <div class="crud-box">
    <div class="top-bar">
      <h3>Gerenciar Acessos (Logins)</h3>
      <button @click="abrirModal()" class="btn-novo">+ Novo Usuário</button>
    </div>

    <table class="tabela">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Login</th>
          <th>Perfil</th>
          <th>Empresa Vinculada</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in lista" :key="u.id" :class="{ inativo: !u.ativo }">
          <td>{{ u.nome }}</td>
          <td><strong>{{ u.login }}</strong></td>
          <td>
             <span :class="['badge', u.perfil === 'ADMIN' ? 'admin' : 'cliente']">
                {{ u.perfil }}
             </span>
          </td>
          <td>{{ u.empresaNome || '-' }}</td>
          <td>
             <button @click="toggleStatus(u)" class="btn-status">
                {{ u.ativo ? '✅ Ativo' : '❌ Inativo' }}
             </button>
          </td>
          <td>
             <button @click="abrirModal(u)" class="btn-icon">✏️</button>
             <button @click="excluir(u.id)" class="btn-icon trash">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="modalAberto" class="modal-backdrop" @click.self="modalAberto = false">
       <div class="modal-card">
          <h3>{{ editando ? 'Editar' : 'Criar' }} Usuário</h3>

          <label>Nome Completo:</label>
          <input v-model="form.nome" placeholder="Ex: João Silva ou Admin">

          <label>Login de Acesso:</label>
          <input v-model="form.login" placeholder="Ex: metalurgica">

          <label>Senha:</label>
          <input type="password" v-model="form.password" :placeholder="editando ? '(Deixe em branco para manter)' : 'Crie uma senha'">

          <div class="row">
             <div class="col">
                <label>Perfil:</label>
                <select v-model="form.perfil">
                   <option value="CLIENTE">CLIENTE (Restrito)</option>
                   <option value="ADMIN">ADMIN (Total)</option>
                </select>
             </div>

             <div class="col" v-if="form.perfil === 'CLIENTE'">
                <label>Empresa:</label>
                <select v-model="form.empresaId">
                   <option value="">Selecione...</option>
                   <option v-for="e in empresas" :key="e.id" :value="e.id">{{ e.nome }}</option>
                </select>
             </div>
          </div>

          <div class="acoes-modal">
             <button @click="salvar" class="btn-save">Salvar</button>
             <button @click="modalAberto = false" class="btn-cancel">Cancelar</button>
          </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos similares aos outros CRUDs */
.crud-box { margin-top: 20px; }
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }

.btn-novo { background: #42b983; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; }

.tabela { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.tabela th, .tabela td { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
.tabela th { background: #f8f9fa; color: #555; }
.inativo { opacity: 0.6; background: #f9f9f9; }

.badge { padding: 3px 8px; border-radius: 10px; font-size: 0.8em; font-weight: bold; }
.badge.admin { background: #2c3e50; color: white; }
.badge.cliente { background: #e3f2fd; color: #1565c0; }

.btn-status { border: 1px solid #ccc; background: none; cursor: pointer; border-radius: 4px; padding: 2px 5px;}
.btn-icon { background: none; border: none; cursor: pointer; font-size: 1.2em; margin-right: 5px; }

/* Modal */
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-card { background: white; padding: 25px; border-radius: 8px; width: 450px; display: flex; flex-direction: column; gap: 10px; }
.modal-card input, .modal-card select { padding: 10px; border: 1px solid #ccc; border-radius: 5px; width: 100%; }
.row { display: flex; gap: 10px; }
.col { flex: 1; }
.acoes-modal { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
.btn-save { background: #42b983; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
.btn-cancel { background: #ccc; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
</style>