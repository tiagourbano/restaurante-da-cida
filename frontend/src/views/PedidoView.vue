<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

// --- ESTADOS DO SISTEMA ---
const loading = ref(true);
const bloqueado = ref(false);
const mensagemBloqueio = ref('');

// Dados fixos do sistema (Tamanhos e Opções)
const tamanhosDisponiveis = ref([]);
const opcoesDisponiveis = ref([]);

// Lista de Cardápios (Pode ser 1 ou 2)
const cardapios = ref([]);
// Controla qual aba está ativa (0 = Primeiro cardápio, 1 = Segundo cardápio)
const abaAtiva = ref(0);

// --- O CORAÇÃO DO FORMULÁRIO (Array de Pedidos) ---
// Em vez de variáveis simples, teremos um array de objetos (um para cada aba/cardápio)
const formularios = ref([]);

// Helper para formatar a data da aba (Ex: "15/03 (Domingo)")
const formatarDataAba = (dataString) => {
  const data = new Date(dataString.split('T')[0] + 'T12:00:00');
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return `${data.toLocaleDateString('pt-BR').slice(0,5)} (${dias[data.getDay()]})`;
};

// Computados Globais (Opções)
const opcoesExtras = computed(() => opcoesDisponiveis.value.filter(o => o.tipo !== 'TROCA'));
const opcoesTrocas = computed(() => opcoesDisponiveis.value.filter(o => o.tipo === 'TROCA'));

onMounted(async () => {
  if (!authStore.funcionario) {
    router.push('/login');
    return;
  }

  try {
    const res = await api.get('/dados-pedido', {
      params: {
        setorId: authStore.funcionario.setorId,
        funcionarioId: authStore.funcionario.id
      }
    });

    // Povoa os dados base
    tamanhosDisponiveis.value = res.data.tamanhos;
    opcoesDisponiveis.value = res.data.opcoes;

    // O NOVO RETORNO DO BACKEND (Array)
    cardapios.value = res.data.cardapiosDisponiveis || [];

    // Cria os formulários vazios correspondentes a cada cardápio recebido
    formularios.value = cardapios.value.map(c => ({
       cardapioId: c.id,
       dataServico: c.dataServico, // Guardamos a data para exibição
       pratoPrincipal: c.pratoPrincipal,
       guarnicoes: c.guarnicoes,
       tamanhoSelecionado: null,
       observacao: '',
       opcoesSelecionadas: [], // Checkboxes
       trocaSelecionada: null  // Radio
    }));

  } catch (error) {
    if (error.response && error.response.status === 403) {
      bloqueado.value = true;
      mensagemBloqueio.value = error.response.data.message;
    } else if (error.response && error.response.status === 404) {
      alert(error.response.data.message || 'Ainda não há cardápio cadastrado.');
      router.push('/login');
    } else {
      alert('Erro ao carregar sistema.');
    }
  } finally {
    loading.value = false;
  }
});

// --- LÓGICA DE SALVAR ---
const finalizarPedido = async () => {
  // 1. Validação (Exigimos que, se houver 2 abas, ambas tenham tamanho selecionado)
  // Como combinamos (Opção 2.2), vamos permitir pedir só 1, mas com AVISO.

  const formsPreenchidos = formularios.value.filter(f => f.tamanhoSelecionado !== null);
  const totalAbas = formularios.value.length;

  if (formsPreenchidos.length === 0) {
     return alert('Por favor, escolha o tamanho da marmita em pelo menos um dos dias.');
  }

  // AVISO DE "ESQUECIMENTO" (Só dispara se a tela tiver múltiplas opções e ele não preencheu todas)
  if (totalAbas > 1 && formsPreenchidos.length < totalAbas) {
      const confirma = confirm(`Atenção: Você tem direito a pedir para ${totalAbas} dias, mas preencheu apenas ${formsPreenchidos.length}.\n\nTem certeza que deseja pedir APENAS as marmitas selecionadas e ignorar o outro dia?`);
      if (!confirma) {
          return; // Aborta para ele poder voltar e preencher a outra aba
      }
  }

  // 2. Montar o Payload (Array de Pedidos reais)
  const payloadFinal = formsPreenchidos.map(form => {
      let idsFinais = [...form.opcoesSelecionadas];
      if (form.trocaSelecionada) {
        idsFinais.push(form.trocaSelecionada);
      }

      return {
          funcionarioId: authStore.funcionario.id,
          cardapioId: form.cardapioId,
          tamanhoId: form.tamanhoSelecionado,
          observacao: form.observacao,
          opcoesEscolhidasIds: idsFinais
      };
  });

  // 3. Enviar para o Backend
  try {
    await api.post('/pedido', payloadFinal); // Enviando o Array!
    alert(`Pedido(s) realizado(s) com sucesso, ${authStore.funcionario.nome}!`);
    authStore.logout();
    router.push('/login');
  } catch (error) {
    alert(error.response?.data?.message || 'Erro ao salvar.');
    if (error.response?.status === 403) {
      router.push('/login');
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
    <!-- <p class="instrucao">Por favor, entre em contato com o restaurante (35) 99884-2001.</p> -->
    <p class="instrucao">Por favor, entre em contato com a Eliana da portaria.</p>
    <button @click="router.push('/login')" class="btn-voltar">Voltar</button>
  </div>

  <div v-else-if="!loading && formularios.length > 0" class="pedido-container">
    <header>
      <small>Olá, {{ authStore.funcionario?.nome }}</small>

      <h2 v-if="formularios.length > 1" style="color: #e67e22;">📅 Pedido de Turno Duplo</h2>
      <h2 v-else>Cardápio de Hoje</h2>
    </header>

    <div v-if="formularios.length > 1" class="abas-navegacao">
      <button
        v-for="(form, index) in formularios" :key="index"
        :class="{ ativa: abaAtiva === index, 'preenchida': form.tamanhoSelecionado !== null }"
        @click="abaAtiva = index"
      >
        {{ formatarDataAba(form.dataServico) }}
        <span v-if="form.tamanhoSelecionado" class="check-aba">✅</span>
      </button>
    </div>

    <div class="form-conteudo" v-if="formularios[abaAtiva]">
      <div class="prato-dia">
        <h3>🍽️ {{ formularios[abaAtiva].pratoPrincipal }}</h3>
        <p>{{ formularios[abaAtiva].guarnicoes }}</p>
      </div>

      <div class="grupo-secao">
        <div class="secao">
          <!-- <h3>1. Escolha o Tamanho</h3> -->
          <h3>Escolha o Tamanho</h3>
          <div class="grid-botoes">
            <button
              v-for="tam in tamanhosDisponiveis"
              :key="tam.id"
              :class="{ ativo: formularios[abaAtiva].tamanhoSelecionado === tam.id }"
              @click="formularios[abaAtiva].tamanhoSelecionado = tam.id"
            >
              <br>
              {{ tam.nome }} <br>
              <small>&nbsp;</small>
              <!-- <small>R$ {{ tam.preco }}</small> -->
            </button>
          </div>
        </div>

        <div class="secao" v-if="opcoesExtras.length > 0">
          <!-- <h3>3. Personalizar</h3> -->
          <h3>Personalizar</h3>
          <div class="opcoes-lista">
            <label v-for="op in opcoesExtras" :key="op.id" class="check-item">
              <input type="checkbox" :value="op.id" v-model="formularios[abaAtiva].opcoesSelecionadas">
              <span>{{ op.nome }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="grupo-secao">
        <div class="secao" v-if="opcoesTrocas.length > 0">
          <!-- <h3>2. Quer trocar o prato principal?</h3> -->
          <h3>Quer trocar o prato principal?</h3>
          <div class="opcoes-lista">
            <label class="radio-item">
              <input type="radio" :value="null" v-model="formularios[abaAtiva].trocaSelecionada">
              <span>Não trocar (Manter prato do dia)</span>
            </label>

            <label v-for="troca in opcoesTrocas" :key="troca.id" class="radio-item">
              <input type="radio" :value="troca.id" v-model="formularios[abaAtiva].trocaSelecionada">
              <span>{{ troca.nome }}</span>
            </label>
          </div>
        </div>

        <div class="secao">
          <h3>Observações</h3>
          <textarea v-model="formularios[abaAtiva].observacao" rows="3" placeholder="Ex: Carne bem passada..."></textarea>
        </div>
      </div>
    </div>

    <button
       v-if="formularios.length > 1 && abaAtiva < (formularios.length - 1)"
       class="btn-avancar"
       @click="abaAtiva++"
    >
      ⏭️ Preencher Próximo Dia
    </button>

    <button v-else class="btn-finalizar" @click="finalizarPedido">
      ✅ CONFIRMAR PEDIDO
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
.header-pedido { margin-bottom: 15px; }

/* ABAS DE NAVEGAÇÃO */
.abas-navegacao { display: flex; gap: 5px; margin-bottom: 20px; background: #eee; padding: 5px; border-radius: 10px; }
.abas-navegacao button {
    flex: 1; padding: 12px 5px; border: none; background: transparent;
    border-radius: 8px; font-weight: bold; color: #7f8c8d; cursor: pointer;
    font-size: 0.9em; display: flex; align-items: center; justify-content: center; gap: 5px;
}
.abas-navegacao button.ativa { background: white; color: #2c3e50; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
.abas-navegacao button.preenchida { color: #27ae60; }
.check-aba { font-size: 0.8em; }

.prato-dia { background: #f0f0f0; padding: 15px; border-radius: 8px; border-left: 5px solid #42b983; margin-bottom: 20px;}

@media (max-width: 1024px) {
  .pedido-container { max-width: 90%; }
  .grupo-secao {
    /* display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px; */
    float: left;
    display: block;
    width: 48%;
    margin: 0 2% 0 0;
  }
  .grupo-secao:last-child {
    margin: 0;
  }
}
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
.btn-avancar {
  width: 100%; padding: 20px; background: #f39c12; color: white; font-size: 18px; font-weight: bold; border: none; border-radius: 8px; margin-top: 10px; box-shadow: 0 4px 6px rgba(243, 156, 18, 0.3);
}
</style>
