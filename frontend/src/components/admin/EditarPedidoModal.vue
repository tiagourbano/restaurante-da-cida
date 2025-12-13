<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../../services/api';

const props = defineProps(['pedidoId']);
const emit = defineEmits(['close', 'salvo']);

const loading = ref(true);
const dadosGerais = ref({ tamanhos: [], opcoes: [] }); // Carrega opções do sistema
const form = ref({
  tamanhoId: null,
  observacao: '',
  opcoesCheck: [], // Para checkboxes
  opcaoRadio: null // Para radio button
});

// Carrega tudo que precisa
onMounted(async () => {
  try {
    // 1. Busca os cadastros gerais (Tamanhos, Opções) - Reutilizando rota pública ou crie uma no admin
    // Dica: Use a rota existente do PedidoController ou do GerencialController
    const resGeral = await api.get('/dados-pedido?setorId=1'); // Hack: Passa setor 1 só pra pegar a lista, ou crie rota especifica
    // O ideal seria: const resGeral = await api.get('/admin/dados-form-pedido');

    // Vamos assumir que você tem uma rota que traz tamanhos e opcoes.
    // Se não tiver, use a /dados-pedido mesmo, mas cuidado com bloqueio de horário.
    // MELHOR: Use as rotas do GerencialController que criamos (listarTamanhos, listarOpcoes)
    const [resTam, resOp] = await Promise.all([
        api.get('/admin/tamanhos'),
        api.get('/admin/opcoes')
    ]);

    dadosGerais.value.tamanhos = resTam.data;
    dadosGerais.value.opcoes = resOp.data;

    // 2. Busca os dados DESTE pedido
    const resPedido = await api.get(`/admin/pedidos/${props.pedidoId}`);
    const ped = resPedido.data;

    form.value.tamanhoId = ped.tamanhoId;
    form.value.observacao = ped.observacao;

    // 3. Distribui os IDs que vieram do banco entre Radio e Checkbox
    const idsExistentes = ped.opcoesEscolhidasIds || [];

    // Separa o que é troca (radio) do que é extra (check)
    const opcoesTroca = dadosGerais.value.opcoes.filter(o => o.tipo === 'TROCA');

    // Tenta achar qual ID pertence às trocas
    const idTroca = idsExistentes.find(id => opcoesTroca.some(ot => ot.id === id));
    form.value.opcaoRadio = idTroca || null;

    // O resto vai pro checkbox
    form.value.opcoesCheck = idsExistentes.filter(id => id !== idTroca);

  } catch (error) {
    alert('Erro ao carregar dados do pedido.');
    emit('close');
  } finally {
    loading.value = false;
  }
});

const salvar = async () => {
  const idsFinais = [...form.value.opcoesCheck];
  if (form.value.opcaoRadio) idsFinais.push(form.value.opcaoRadio);

  try {
    await api.put(`/admin/pedidos/${props.pedidoId}`, {
      tamanhoId: form.value.tamanhoId,
      observacao: form.value.observacao,
      opcoesEscolhidasIds: idsFinais
    });
    alert('Pedido alterado!');
    emit('salvo');
  } catch (error) {
    alert('Erro ao salvar alteração.');
  }
};

// Computados para template
const opcoesTrocas = computed(() => dadosGerais.value.opcoes.filter(o => o.tipo === 'TROCA'));
const opcoesExtras = computed(() => dadosGerais.value.opcoes.filter(o => o.tipo !== 'TROCA'));

</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <h3>Editar Pedido #{{ pedidoId }}</h3>

      <div v-if="loading">Carregando...</div>

      <div v-else class="form-content">
        <label>Tamanho:</label>
        <select v-model="form.tamanhoId">
          <option v-for="t in dadosGerais.tamanhos" :key="t.id" :value="t.id">
            {{ t.nome }} (R$ {{ t.preco }})
          </option>
        </select>

        <div class="grupo-opcoes" v-if="opcoesTrocas.length">
          <label>Prato Principal:</label>
          <div class="opcoes-row">
            <label class="radio">
              <input type="radio" :value="null" v-model="form.opcaoRadio">
              Padrão
            </label>
            <label v-for="op in opcoesTrocas" :key="op.id" class="radio">
              <input type="radio" :value="op.id" v-model="form.opcaoRadio">
              {{ op.nome }}
            </label>
          </div>
        </div>

        <div class="grupo-opcoes" v-if="opcoesExtras.length">
          <label>Adicionais / Remoções:</label>
          <div class="opcoes-row">
            <label v-for="op in opcoesExtras" :key="op.id" class="check">
              <input type="checkbox" :value="op.id" v-model="form.opcoesCheck">
              {{ op.nome }}
            </label>
          </div>
        </div>

        <label>Observação:</label>
        <textarea v-model="form.observacao" rows="3"></textarea>

        <div class="acoes">
          <button @click="salvar" class="btn-save">Salvar Alterações</button>
          <button @click="$emit('close')" class="btn-cancel">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000;
}
.modal-card {
  background: white; padding: 25px; border-radius: 8px; width: 500px; max-width: 90%; max-height: 90vh; overflow-y: auto;
}
.form-content { display: flex; flex-direction: column; gap: 15px; margin-top: 15px; }
select, textarea { padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 100%; }
.grupo-opcoes label { font-weight: bold; display: block; margin-bottom: 5px; }
.opcoes-row { display: flex; flex-wrap: wrap; gap: 10px; }
.radio, .check { font-weight: normal !important; display: flex; align-items: center; gap: 5px; background: #f0f0f0; padding: 5px 10px; border-radius: 20px; cursor: pointer; }
.btn-save { background: #42b983; color: white; padding: 12px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
.btn-cancel { background: #ccc; color: black; padding: 12px; border: none; border-radius: 5px; cursor: pointer; }
</style>