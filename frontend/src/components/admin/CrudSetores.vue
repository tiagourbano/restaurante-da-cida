<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

const lista = ref([]);
const empresas = ref([]);
const loading = ref(false);

const form = ref({ id: null, nome: '', empresaId: '' });
const modalAberto = ref(false);
const editando = ref(false);

// --- CARREGAR DADOS ---
const carregarDados = async () => {
  loading.value = true;
  try {
    const [resSetores, resEmpresas] = await Promise.all([
        api.get('/admin/setores'), // A nova rota plana
        api.get('/admin/empresas')
    ]);
    lista.value = resSetores.data;
    empresas.value = resEmpresas.data;
  } catch (error) {
    alert('Erro ao carregar dados.');
  } finally {
    loading.value = false;
  }
};

// --- AÇÕES ---
const salvar = async () => {
  if (!form.value.nome || !form.value.empresaId) return alert('Preencha tudo.');

  try {
    await api.post('/admin/setores', form.value);
    modalAberto.value = false;
    carregarDados();
  } catch (error) {
    alert('Erro ao salvar.');
  }
};

const abrirModal = (item = null) => {
  if (item) {
    form.value = { ...item };
    editando.value = true;
  } else {
    form.value = { id: null, nome: '', empresaId: '' };
    editando.value = false;
  }
  modalAberto.value = true;
};

const excluir = async (id) => {
  if (!confirm('Tem certeza? Isso só funcionará se o setor estiver vazio (sem funcionários).')) return;
  try {
    await api.delete(`/admin/setores/${id}`);
    carregarDados();
  } catch (error) {
    alert(error.response?.data?.message || 'Erro ao excluir.');
  }
};

onMounted(carregarDados);
</script>

<template>
  <div class="crud-box">
    <div class="top-bar">
      <h3>Gerenciar Setores</h3>
      <button @click="abrirModal()" class="btn-novo">+ Novo Setor</button>
    </div>

    <div v-if="loading">Carregando...</div>
    <table v-else class="tabela">
      <thead>
        <tr>
          <th>Empresa</th>
          <th>Setor</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in lista" :key="item.id">
          <td>
             <span class="badge-empresa">{{ item.empresaNome }}</span>
          </td>
          <td>{{ item.nome }}</td>
          <td>
            <button @click="abrirModal(item)" class="btn-icon">✏️</button>
            <button @click="excluir(item.id)" class="btn-icon trash">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="modalAberto" class="modal-backdrop" @click.self="modalAberto = false">
      <div class="modal-card">
        <h3>{{ editando ? 'Editar' : 'Criar' }} Setor</h3>

        <label>Empresa Pertencente:</label>
        <select v-model="form.empresaId">
           <option value="" disabled>Selecione...</option>
           <option v-for="e in empresas" :key="e.id" :value="e.id">{{ e.nome }}</option>
        </select>

        <label>Nome do Setor:</label>
        <input v-model="form.nome" placeholder="Ex: Produção, RH...">

        <div class="acoes-modal">
           <button @click="salvar" class="btn-save">Salvar</button>
           <button @click="modalAberto = false" class="btn-cancel">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crud-box { margin-top: 20px; }
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }

.btn-novo { background: #42b983; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; }

.tabela { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.tabela th, .tabela td { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
.tabela th { background: #f8f9fa; color: #555; }

.btn-icon { background: none; border: none; cursor: pointer; font-size: 1.2em; margin-right: 10px; }
.btn-icon.trash:hover { transform: scale(1.2); }

/* Modal Styles (Reutilizados) */
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-card { background: white; padding: 25px; border-radius: 8px; width: 400px; display: flex; flex-direction: column; gap: 10px; }
.modal-card input, .modal-card select { padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
.acoes-modal { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
.btn-save { background: #42b983; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
.btn-cancel { background: #ccc; color: black; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
</style>