<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

const lista = ref([]);
const form = ref({ id: null, nome: '', trabalhaFimSemana: false });
const editando = ref(false);

const carregar = async () => {
  const res = await api.get('/admin/empresas');
  lista.value = res.data;
};

const salvar = async () => {
  await api.post('/admin/empresas', form.value);
  form.value = { id: null, nome: '', trabalhaFimSemana: false };
  editando.value = false;
  carregar();
};

const editar = (item) => {
  form.value = { ...item };
  // Converte 0/1 do banco para boolean se necessario
  form.value.trabalhaFimSemana = !!form.value.trabalhaFimSemana;
  editando.value = true;
};

const toggleStatus = async (item) => {
  await api.patch('/admin/empresas/status', { id: item.id, ativo: !item.ativo });
  carregar();
};

const cancelar = () => {
  form.value = { id: null, nome: '', trabalhaFimSemana: false };
  editando.value = false;
};

onMounted(carregar);
</script>

<template>
  <div class="crud-box">
    <h3>Empresas Parceiras</h3>

    <div class="form-inline">
      <input v-model="form.nome" placeholder="Nome da Empresa" style="flex: 1;" />

      <label class="check-fds">
        <input type="checkbox" v-model="form.trabalhaFimSemana">
        Trabalha FDS?
      </label>

      <button @click="salvar" class="btn-save">{{ editando ? 'Salvar' : 'Criar' }}</button>
      <button v-if="editando" @click="cancelar" class="btn-cancel">Cancelar</button>
    </div>

    <table>
      <thead><tr><th>Nome</th><th>Fim de Semana</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>
        <tr v-for="item in lista" :key="item.id" :class="{ inativo: !item.ativo }">
          <td>{{ item.nome }}</td>
          <td>{{ item.trabalhaFimSemana ? 'Sim' : 'Não' }}</td>
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
/* Reuse os estilos */
.form-inline { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; }
.check-fds { display: flex; align-items: center; gap: 5px; cursor: pointer; user-select: none; }
table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
table th, table td { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
table th { background: #f8f9fa; color: #555; }
.inativo { opacity: 0.6; background: #f9f9f9; }
.btn-save { background: #42b983; color: white; border: none; padding: 8px 15px; cursor: pointer; border-radius: 4px;}
.btn-cancel { background: #999; color: white; border: none; padding: 8px 15px; cursor: pointer; border-radius: 4px;}
.btn-status { background: none; border: 1px solid #ccc; cursor: pointer; border-radius: 4px; padding: 4px;}
</style>