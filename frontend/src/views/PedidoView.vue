<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

// Dados da API
const dados = ref({
  cardapio: {},
  tamanhos: [],
  opcoes: []
});
const loading = ref(true);

const bloqueado = ref(false);
const mensagemBloqueio = ref('');

// Formulário
const tamanhoSelecionado = ref(null);
const observacao = ref('');
const opcoesSelecionadas = ref([]); // Array de IDs para checkboxes
const trocaSelecionada = ref(null); // ID único para radio

// Computados para separar a UI
const opcoesExtras = computed(() =>
  dados.value.opcoes.filter(o => o.tipo !== 'TROCA')
);
const opcoesTrocas = computed(() =>
  dados.value.opcoes.filter(o => o.tipo === 'TROCA')
);

onMounted(async () => {
  if (!authStore.funcionario) {
    router.push('/login'); // Chuta de volta pro login se não tiver user
    return;
  }
  try {
    const res = await api.get('/dados-pedido', {
      params: {
        setorId: authStore.funcionario.setorId,
        funcionarioId: authStore.funcionario.id,
      }
    });
    dados.value = res.data;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      bloqueado.value = true;
      mensagemBloqueio.value = error.response.data.message;
    } else if (error.response && error.response.status === 404) {
      alert('Ainda não há cardápio cadastrado para hoje.');
      router.push('/login');
    } else {
      alert('Erro ao carregar sistema.');
    }
  } finally {
    loading.value = false;
  }
});

const finalizarPedido = async () => {
  if (!tamanhoSelecionado.value) {
    alert('Por favor, escolha o tamanho da marmita.');
    return;
  }

  // Monta o array final de IDs (junta checkboxes + radio da troca)
  let idsFinais = [...opcoesSelecionadas.value];
  if (trocaSelecionada.value) {
    idsFinais.push(trocaSelecionada.value);
  }

  const payload = {
    funcionarioId: authStore.funcionario.id,
    cardapioId: dados.value.cardapio.id,
    tamanhoId: tamanhoSelecionado.value,
    observacao: observacao.value,
    opcoesEscolhidasIds: idsFinais
  };

  try {
    await api.post('/pedido', payload);
    alert(`Pedido realizado com sucesso, ${authStore.funcionario.nome}!`);
    authStore.logout(); // Limpa sessão
    router.push('/login'); // Volta pro início pro próximo da fila
  } catch (error) {
    alert(error.response?.data?.message || 'Erro ao salvar.');
    if (error.response?.status === 403) {
          router.push('/login'); // Ou recarrega a página para mostrar a tela de bloqueio
    }
  }
};
</script>

<template>
  <div v-if="bloqueado && !loading" class="bloqueio-container">
    <div class="icone">
       {{ mensagemBloqueio.includes('encerrado') ? '⏰' : '✅' }}
    </div>

    <h2>
       {{ mensagemBloqueio.includes('encerrado') ? 'Ops! Não é possível pedir agora.' : 'Pedido Já Realizado' }}
    </h2>

    <p class="msg-aviso" v-html="mensagemBloqueio"></p>
    <p class="instrucao">Por favor, entre em contato com o restaurante (35) 99884-2001.</p>
    <button @click="router.push('/login')" class="btn-voltar">Voltar</button>
  </div>

  <div v-else-if="!loading" class="pedido-container">
    <header>
      <small>Olá, {{ authStore.funcionario?.nome }}</small>
      <h2>Cardápio de Hoje</h2>
      <div class="prato-dia">
        <h3>{{ dados.cardapio.pratoPrincipal }}</h3>
        <p>{{ dados.cardapio.guarnicoes }}</p>
      </div>
    </header>

    <div class="secao">
      <h3>1. Escolha o Tamanho</h3>
      <div class="grid-botoes">
        <button
          v-for="tam in dados.tamanhos"
          :key="tam.id"
          :class="{ ativo: tamanhoSelecionado === tam.id }"
          @click="tamanhoSelecionado = tam.id"
        >
          <br>
          {{ tam.nome }} <br>
          <small>&nbsp;</small>
          <!-- <small>R$ {{ tam.preco }}</small> -->
        </button>
      </div>
    </div>

    <div class="secao" v-if="opcoesTrocas.length > 0">
      <h3>2. Quer trocar o prato principal?</h3>
      <div class="opcoes-lista">
        <label class="radio-item">
          <input type="radio" :value="null" v-model="trocaSelecionada">
          <span>Não trocar (Manter prato do dia)</span>
        </label>

        <label v-for="troca in opcoesTrocas" :key="troca.id" class="radio-item">
          <input type="radio" :value="troca.id" v-model="trocaSelecionada">
          <span>{{ troca.nome }}</span>
        </label>
      </div>
    </div>

    <div class="secao" v-if="opcoesExtras.length > 0">
      <h3>3. Personalizar</h3>
      <div class="opcoes-lista">
        <label v-for="op in opcoesExtras" :key="op.id" class="check-item">
          <input type="checkbox" :value="op.id" v-model="opcoesSelecionadas">
          <span>{{ op.nome }}</span>
        </label>
      </div>
    </div>

    <div class="secao">
      <h3>Observações</h3>
      <textarea v-model="observacao" rows="3" placeholder="Ex: Carne bem passada..."></textarea>
    </div>

    <button class="btn-finalizar" @click="finalizarPedido">
      CONFIRMAR PEDIDO
    </button>
  </div>
</template>

<style scoped>
.bloqueio-container {
  text-align: center;
  padding: 50px 20px;
  max-width: 500px;
  margin: 0 auto;
}
.icone { font-size: 60px; margin-bottom: 20px; }
.msg-aviso {
  font-size: 18px;
  color: #d32f2f;
  font-weight: bold;
  background: #ffebee;
  padding: 15px;
  border-radius: 8px;
  margin: 20px 0;
}
.instrucao { color: #666; margin-bottom: 30px; }
.btn-voltar {
  padding: 15px 30px;
  background-color: #2c3e50;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
}

.pedido-container { padding: 15px; max-width: 600px; margin: 0 auto; }
.prato-dia { background: #f0f0f0; padding: 15px; border-radius: 8px; border-left: 5px solid #42b983; margin-bottom: 20px;}
.secao { margin-bottom: 25px; }
h3 { margin-bottom: 10px; color: #333; }

/* Botões de Tamanho */
.grid-botoes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.grid-botoes button {
  padding: 15px; border: 1px solid #ddd; background: white; border-radius: 8px; font-size: 16px;
}
.grid-botoes button.ativo {
  background: #42b983; color: white; border-color: #2a7c56; font-weight: bold;
}

/* Listas */
.opcoes-lista { display: flex; flex-direction: column; gap: 10px; }
.radio-item, .check-item {
  display: flex; align-items: center; gap: 10px; padding: 10px; background: #fff; border: 1px solid #eee;
}
input[type=radio], input[type=checkbox] { transform: scale(1.5); }

textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 5px; }

.btn-finalizar {
  width: 100%; padding: 20px; background: #2c3e50; color: white; font-size: 18px; font-weight: bold; border: none; border-radius: 8px; margin-top: 20px;
}
</style>
