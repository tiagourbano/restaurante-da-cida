<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

const lista = ref([]);
const form = ref({ id: null, nome: '', preco: '' });
const editando = ref(false);

const carregar = async () => {
  const res = await api.get('/admin/tamanhos');
  lista.value = res.data;
};

const salvar = async () => {
  await api.post('/admin/tamanhos', form.value);
  form.value = { id: null, nome: '', preco: '' }; // Limpa form
  editando.value = false;
  carregar();
};

const editar = (item) => {
  form.value = { ...item }; // Copia os dados
  editando.value = true;
};

const toggleStatus = async (item) => {
  await api.patch('/admin/tamanhos/status', { id: item.id, ativo: !item.ativo });
  carregar();
};

const cancelar = () => {
  form.value = { id: null, nome: '', preco: '' };
  editando.value = false;
};

onMounted(carregar);
</script>

<template>
  <div class="crud-box">
    <h3>Gerenciar Tamanhos</h3>

    <div class="form-inline">
      <input v-model="form.nome" placeholder="Nome (Ex: Grande)" />
      <input v-model="form.preco" type="number" step="0.01" placeholder="Preço (R$)" />
      <button @click="salvar" class="btn-save">{{ editando ? 'Atualizar' : 'Adicionar' }}</button>
      <button v-if="editando" @click="cancelar" class="btn-cancel">Cancelar</button>
    </div>

    <table>
      <thead><tr><th>Nome</th><th>Preço</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>
        <tr v-for="item in lista" :key="item.id" :class="{ inativo: !item.ativo }">
          <td>{{ item.nome }}</td>
          <td>R$ {{ item.preco }}</td>
          <td>
            <button @click="toggleStatus(item)" class="btn-status">
              {{ item.ativo ? '✅ Ativo' : '❌ Inativo' }}
            </button>
          </td>
          <td><button @click="editar(item)">✏️ Editar</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Estilos básicos de tabela e form */
.crud-box { margin-top: 20px; }
.form-inline { display: flex; gap: 10px; margin-bottom: 20px; }
input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
table th, table td { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
table th { background: #f8f9fa; color: #555; }
.inativo { opacity: 0.6; background: #f9f9f9; }
.btn-save { background: #42b983; color: white; border: none; padding: 8px 15px; cursor: pointer; border-radius: 4px;}
.btn-cancel { background: #999; color: white; border: none; padding: 8px 15px; cursor: pointer; border-radius: 4px;}
.btn-status { background: none; border: 1px solid #ccc; cursor: pointer; border-radius: 4px; padding: 4px;}
</style>