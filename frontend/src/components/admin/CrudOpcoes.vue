<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

const lista = ref([]);
const form = ref({ id: null, nome: '', tipo: 'TROCA', ordemExibicao: 1 });
const editando = ref(false);

const carregar = async () => {
  const res = await api.get('/admin/opcoes');
  lista.value = res.data;
};

const salvar = async () => {
  await api.post('/admin/opcoes', form.value);
  form.value = { id: null, nome: '', tipo: 'TROCA', ordemExibicao: lista.value.length + 1 };
  editando.value = false;
  carregar();
};

const editar = (item) => {
  form.value = { ...item };
  editando.value = true;
};

const toggleStatus = async (item) => {
  await api.patch('/admin/opcoes/status', { id: item.id, ativo: !item.ativo });
  carregar();
};

const cancelar = () => {
  form.value = { id: null, nome: '', tipo: 'TROCA', ordemExibicao: 1 };
  editando.value = false;
};

onMounted(carregar);
</script>

<template>
  <div class="crud-box">
    <h3>Opções Extras (Trocas e Adicionais)</h3>

    <div class="form-grid">
      <input v-model="form.nome" placeholder="Nome (Ex: Sem Feijão)" />

      <select v-model="form.tipo">
        <option value="TROCA">Troca (Radio Button)</option>
        <option value="ADICIONAL">Adicional (Checkbox)</option>
        <option value="REMOCAO">Remoção (Checkbox)</option>
      </select>

      <input v-model="form.ordemExibicao" type="number" placeholder="Ordem" style="width: 60px;" />

      <button @click="salvar" class="btn-save">{{ editando ? 'Salvar' : 'Criar' }}</button>
      <button v-if="editando" @click="cancelar" class="btn-cancel">Cancelar</button>
    </div>

    <table>
      <thead><tr><th>Ordem</th><th>Nome</th><th>Tipo</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>
        <tr v-for="item in lista" :key="item.id" :class="{ inativo: !item.ativo }">
          <td>{{ item.ordemExibicao }}</td>
          <td>{{ item.nome }}</td>
          <td><span class="badge">{{ item.tipo }}</span></td>
          <td>
             <button @click="toggleStatus(item)" class="btn-status">
              {{ item.ativo ? '✅ Ativo' : '❌ Inativo' }}
            </button>
          </td>
          <td><button @click="editar(item)">✏️</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Reuse os estilos do componente anterior */
.form-grid { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; }
input, select { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.badge { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: bold; }
.crud-box { margin-top: 20px; }
.form-inline { display: flex; gap: 10px; margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
table th, table td { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
table th { background: #f8f9fa; color: #555; }
.inativo { opacity: 0.6; background: #f9f9f9; }
.btn-save { background: #42b983; color: white; border: none; padding: 8px 15px; cursor: pointer; border-radius: 4px;}
.btn-cancel { background: #999; color: white; border: none; padding: 8px 15px; cursor: pointer; border-radius: 4px;}
.btn-status { background: none; border: 1px solid #ccc; cursor: pointer; border-radius: 4px; padding: 4px;}
</style>