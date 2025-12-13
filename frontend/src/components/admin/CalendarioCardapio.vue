<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import api from '../../services/api';

// Controle de Data
const dataAtual = ref(new Date()); // Data de referência para o calendário
const mesExibido = ref(dataAtual.value.getMonth()); // 0 a 11
const anoExibido = ref(dataAtual.value.getFullYear());

const cardapiosDoMes = ref([]);
const modalAberto = ref(false);
const loading = ref(false);

// Form do Modal
const form = ref({
  id: null,
  dataServico: '',
  pratoPrincipal: '',
  guarnicoes: ''
});

// Nomes dos meses
const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// --- LÓGICA DO CALENDÁRIO ---
const diasNoMes = computed(() => {
  return new Date(anoExibido.value, mesExibido.value + 1, 0).getDate();
});

const diaSemanaInicio = computed(() => {
  return new Date(anoExibido.value, mesExibido.value, 1).getDay(); // 0 (Dom) a 6 (Sab)
});

// --- API ---
const carregarCardapios = async () => {
  loading.value = true;
  try {
    const res = await api.get('/admin/cardapios-mes', {
      params: { mes: mesExibido.value + 1, ano: anoExibido.value } // API espera mês 1-12
    });
    cardapiosDoMes.value = res.data;
  } catch (error) {
    alert('Erro ao carregar cardápios.');
  } finally {
    loading.value = false;
  }
};

// --- AÇÕES ---
const mudarMes = (delta) => {
  let novoMes = mesExibido.value + delta;
  let novoAno = anoExibido.value;

  if (novoMes > 11) { novoMes = 0; novoAno++; }
  else if (novoMes < 0) { novoMes = 11; novoAno--; }

  mesExibido.value = novoMes;
  anoExibido.value = novoAno;
  carregarCardapios();
};

// Encontra se existe cardápio para o dia (dia: número 1 a 31)
const getCardapioDia = (dia) => {
  const dataString = `${anoExibido.value}-${String(mesExibido.value + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  // A data que vem do banco geralmente é YYYY-MM-DDT... ou string simples. Vamos comparar string
  return cardapiosDoMes.value.find(c => c.dataServico.startsWith(dataString));
};

const abrirDia = (dia) => {
  const dataString = `${anoExibido.value}-${String(mesExibido.value + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const cardapioExistente = getCardapioDia(dia);

  if (cardapioExistente) {
    form.value = { ...cardapioExistente };
    // Ajuste: A data pode vir completa, garantimos YYYY-MM-DD pro input
    form.value.dataServico = dataString;
  } else {
    // Novo
    form.value = { id: null, dataServico: dataString, pratoPrincipal: '', guarnicoes: '' };
  }

  modalAberto.value = true;
};

const salvar = async () => {
  if (!form.value.pratoPrincipal) return alert('Digite o prato principal');

  try {
    await api.post('/admin/cardapio', form.value);
    modalAberto.value = false;
    carregarCardapios(); // Recarrega para pintar o quadradinho de verde
  } catch (error) {
    alert('Erro ao salvar.');
  }
};

// Carregar ao iniciar
onMounted(carregarCardapios);
</script>

<template>
  <div class="calendario-container">

    <div class="calendario-header">
      <button @click="mudarMes(-1)">◀</button>
      <h2>{{ nomesMeses[mesExibido] }} de {{ anoExibido }}</h2>
      <button @click="mudarMes(1)">▶</button>
    </div>

    <div class="dias-semana">
      <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
    </div>

    <div class="grade-dias">
      <div v-for="n in diaSemanaInicio" :key="'vazio'+n" class="dia vazio"></div>

      <div
        v-for="dia in diasNoMes"
        :key="dia"
        class="dia"
        :class="{ 'tem-cardapio': getCardapioDia(dia) }"
        @click="abrirDia(dia)"
      >
        <span class="numero-dia">{{ dia }}</span>

        <div v-if="getCardapioDia(dia)" class="info-resumo">
          <strong>{{ getCardapioDia(dia).pratoPrincipal }}</strong>
        </div>
        <div v-else class="info-vazio">+ Adicionar</div>
      </div>
    </div>

    <div v-if="modalAberto" class="modal-backdrop" @click.self="modalAberto = false">
      <div class="modal-conteudo">
        <h3>Editar Cardápio: {{ new Date(form.dataServico + 'T12:00:00').toLocaleDateString() }}</h3>

        <label>Prato Principal:</label>
        <input v-model="form.pratoPrincipal" placeholder="Ex: Strogonoff" ref="inputPrato">

        <label>Guarnições:</label>
        <input v-model="form.guarnicoes" placeholder="Ex: Arroz e Batata Palha">

        <div class="modal-acoes">
          <button @click="salvar" class="btn-salvar">Salvar</button>
          <button @click="modalAberto = false" class="btn-cancelar">Fechar</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.calendario-container { max-width: 900px; margin: 0 auto; }

.calendario-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
  background: #2c3e50; color: white; padding: 10px; border-radius: 8px;
}
.calendario-header button { background: none; border: none; color: white; font-size: 24px; cursor: pointer; }

/* Grid */
.dias-semana, .grade-dias {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px;
}
.dias-semana div {
  text-align: center; font-weight: bold; padding: 5px; background: #ddd;
}

.dia {
  border: 1px solid #ddd;
  min-height: 80px; /* Altura do quadradinho */
  background: white;
  padding: 5px;
  cursor: pointer;
  border-radius: 4px;
  transition: 0.2s;
  position: relative;
}
.dia:hover { background-color: #f0f8ff; border-color: #42b983; }

.dia.tem-cardapio {
  background-color: #e8f5e9;
  border: 1px solid #42b983;
}

.numero-dia { font-weight: bold; color: #555; display: block; margin-bottom: 5px;}
.info-resumo { font-size: 12px; color: #2e7d32; line-height: 1.2; }
.info-vazio { font-size: 11px; color: #ccc; margin-top: 10px; text-align: center;}

.dia.vazio { background: transparent; border: none; cursor: default; }

/* Modal */
.modal-backdrop {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 999;
}
.modal-conteudo {
  background: white; padding: 25px; border-radius: 10px; width: 400px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  display: flex; flex-direction: column; gap: 10px;
}
.modal-conteudo input { padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 5px;}
.modal-acoes { display: flex; justify-content: space-between; margin-top: 10px; }
.btn-salvar { background: #42b983; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;}
.btn-cancelar { background: #999; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;}
</style>