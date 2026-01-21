<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import api from '../../services/api';

const emit = defineEmits(['close', 'salvo']);
const loading = ref(false);

// Listas para os Selects
const empresas = ref([]);
const funcionarios = ref([]); // Carregados ao selecionar empresa
const tamanhos = ref([]);
const opcoes = ref([]);

// Formulário
const form = ref({
  empresaId: '',
  funcionarioId: '',
  tamanhoId: null,
  observacao: '',
  opcoesCheck: [],
  opcaoRadio: null
});

// Carrega dados iniciais (Empresas, Tamanhos, Opções)
onMounted(async () => {
  loading.value = true;
  try {
    const [resEmp, resTam, resOp] = await Promise.all([
      api.get('/admin/empresas/simples'), // Use a rota que lista empresas simples
      api.get('/admin/tamanhos'),
      api.get('/admin/opcoes')
    ]);
    empresas.value = resEmp.data;
    tamanhos.value = resTam.data.filter(t => t.ativo !== false);
    opcoes.value = resOp.data.filter(o => o.ativo !== false);
  } catch (error) {
    alert('Erro ao carregar dados.');
    emit('close');
  } finally {
    loading.value = false;
  }
});

// Quando selecionar empresa, busca os funcionários dela
watch(() => form.value.empresaId, async (novoId) => {
  form.value.funcionarioId = '';
  funcionarios.value = [];
  if (!novoId) return;

  try {
    // Precisamos de uma rota que lista funcionários por empresa.
    // Usaremos a rota de listagem com filtro que já criamos no FuncionarioController!
    const res = await api.get(`/admin/funcionarios?empresaId=${novoId}`);
    // Filtra apenas os ativos para não pedir para demitido
    funcionarios.value = res.data.filter(f => f.ativo);
  } catch (error) {
    console.error(error);
  }
});

const salvar = async () => {
  if (!form.value.funcionarioId || !form.value.tamanhoId) {
    return alert('Selecione Funcionário e Tamanho.');
  }

  const idsFinais = [...form.value.opcoesCheck];
  if (form.value.opcaoRadio) idsFinais.push(form.value.opcaoRadio);

  try {
    await api.post('/admin/pedidos', {
      funcionarioId: form.value.funcionarioId,
      tamanhoId: form.value.tamanhoId,
      observacao: form.value.observacao,
      opcoesEscolhidasIds: idsFinais
    });
    alert('Pedido criado com sucesso!');
    emit('salvo');
  } catch (error) {
    alert(error.response?.data?.message || 'Erro ao criar pedido.');
  }
};

// Computados
const opcoesTrocas = computed(() => opcoes.value.filter(o => o.tipo === 'TROCA'));
const opcoesExtras = computed(() => opcoes.value.filter(o => o.tipo !== 'TROCA'));
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <h3>Novo Pedido (Admin)</h3>

      <div v-if="loading">Carregando...</div>
      <div v-else class="form-scroll">

        <div class="secao-pessoa">
            <label>1. Empresa:</label>
            <select v-model="form.empresaId">
                <option value="">Selecione...</option>
                <option v-for="e in empresas" :key="e.id" :value="e.id">{{ e.nome }}</option>
            </select>

            <label>2. Funcionário:</label>
            <select v-model="form.funcionarioId" :disabled="!form.empresaId">
                <option value="">Selecione...</option>
                <option v-for="f in funcionarios" :key="f.id" :value="f.id">{{ f.nome }}</option>
            </select>
        </div>

        <hr>

        <label>3. Tamanho:</label>
        <select v-model="form.tamanhoId">
           <option v-for="t in tamanhos" :key="t.id" :value="t.id">{{ t.nome }}</option>
        </select>

        <div class="grupo-opcoes" v-if="opcoesTrocas.length">
            <label>Prato Principal:</label>
            <div class="opcoes-row">
                <label class="radio">
                    <input type="radio" :value="null" v-model="form.opcaoRadio"> Padrão
                </label>
                <label v-for="op in opcoesTrocas" :key="op.id" class="radio">
                    <input type="radio" :value="op.id" v-model="form.opcaoRadio"> {{ op.nome }}
                </label>
            </div>
        </div>

        <div class="grupo-opcoes" v-if="opcoesExtras.length">
            <label>Adicionais:</label>
            <div class="opcoes-row">
                <label v-for="op in opcoesExtras" :key="op.id" class="check">
                    <input type="checkbox" :value="op.id" v-model="form.opcoesCheck"> {{ op.nome }}
                </label>
            </div>
        </div>

        <label>Observação:</label>
        <textarea v-model="form.observacao" rows="2"></textarea>

        <div class="acoes">
           <button @click="salvar" class="btn-save">Criar Pedido</button>
           <button @click="$emit('close')" class="btn-cancel">Cancelar</button>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-card { background: white; padding: 20px; border-radius: 8px; width: 500px; max-width: 95%; max-height: 90vh; display: flex; flex-direction: column; }
.form-scroll { overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.secao-pessoa { background: #f9f9f9; padding: 10px; border-radius: 6px; border: 1px solid #eee; }
select, textarea { padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 100%; margin-bottom: 5px;}
.opcoes-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;}
.radio, .check { background: #eee; padding: 4px 10px; border-radius: 15px; cursor: pointer; font-size: 0.9em; display: flex; align-items: center; gap: 5px;}
.acoes { display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; }
.btn-save { background: #42b983; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-cancel { background: #ccc; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
</style>
