<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../services/api';

const empresas = ref([]);
const setores = ref([]);
const dadosRelatorio = ref([]);
const loading = ref(false);

// Filtros
const filtro = ref({
  empresaId: '',
  setorId: '',
  dataInicio: '',
  dataFim: ''
});

// Carregar combos iniciais
onMounted(async () => {
  // Dica: Crie uma rota simples /empresas e /setores no backend se não tiver
  // Vou simular que ja tem, ou você pode reutilizar as rotas existentes
  try {
    const resEmp = await api.get('/admin/empresas/simples '); // Crie essa rota ou reutilize
    empresas.value = resEmp.data;
  } catch (e) { console.error('Erro ao carregar empresas'); }

  // Define datas padrao (Inicio do mes ate hoje)
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  filtro.value.dataInicio = primeiroDia.toISOString().split('T')[0];
  filtro.value.dataFim = hoje.toISOString().split('T')[0];
});

const gerarRelatorio = async () => {
  loading.value = true;
  try {
    const res = await api.get('/admin/relatorio', { params: filtro.value });
    dadosRelatorio.value = res.data;
  } catch (error) {
    alert('Erro ao buscar dados.');
  } finally {
    loading.value = false;
  }
};

const baixarExcel = () => {
  // Para baixar arquivo, não usamos axios. Abrimos a URL em nova aba ou window.location
  // Precisamos montar a query string manualmente
  const query = new URLSearchParams(filtro.value).toString();
  window.open(`http://localhost:3000/api/admin/relatorio/excel?${query}`, '_blank');
};

// Formatação de Moeda
const toMoney = (val) => `R$ ${parseFloat(val).toFixed(2)}`;
</script>

<template>
  <div class="relatorio-container">
    <h1>Relatório de Fechamento</h1>

    <div class="filtros no-print">
      <div class="campo">
        <label>Empresa:</label>
        <select v-model="filtro.empresaId">
          <option value="">Todas</option>
          <option v-for="e in empresas" :key="e.id" :value="e.id">{{ e.nome }}</option>
        </select>
      </div>

      <div class="campo">
        <label>De:</label>
        <input type="date" v-model="filtro.dataInicio">
      </div>
      <div class="campo">
        <label>Até:</label>
        <input type="date" v-model="filtro.dataFim">
      </div>

      <button @click="gerarRelatorio" class="btn-gerar">🔍 Pesquisar</button>
      <button @click="baixarExcel" class="btn-excel" :disabled="dadosRelatorio.length === 0">📥 Baixar Excel</button>
    </div>

    <div v-if="loading" class="loading">Calculando valores...</div>

    <div v-else-if="dadosRelatorio.length > 0" class="relatorio-papel">

      <div v-for="emp in dadosRelatorio" :key="emp.id" class="bloco-empresa">
        <div class="header-empresa">
          <span>🏢 {{ emp.nome }}</span>
          <span>Total: {{ toMoney(emp.totalValor) }} ({{ emp.totalQtd }} un)</span>
        </div>

        <div v-for="setor in emp.setores" :key="setor.id" class="bloco-setor">
          <div class="header-setor">
            <span>⚙️ Setor: {{ setor.nome }}</span>
            <span>Subtotal: {{ toMoney(setor.totalValor) }}</span>
          </div>

          <div v-for="dia in setor.dias" :key="dia.data" class="bloco-dia">
            <div class="header-dia">📅 {{ dia.data }}</div>

            <table class="tabela-pedidos">
              <thead>
                <tr>
                  <th>Funcionário</th>
                  <th>Tamanho</th>
                  <th>Detalhes</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(ped, idx) in dia.pedidos" :key="idx">
                  <td>{{ ped.funcionario }}</td>
                  <td>{{ ped.tamanho }}</td>
                  <td style="font-size: 0.9em; color: #555;">{{ ped.extras }}</td>
                  <td>{{ toMoney(ped.preco) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>

    <div v-else class="sem-dados">
      Nenhum dado encontrado para o período.
    </div>

  </div>
</template>

<style scoped>
.relatorio-container { padding: 20px; max-width: 1000px; margin: 0 auto; }

/* Filtros */
.filtros {
  background: #f0f0f0; padding: 15px; border-radius: 8px; display: flex; gap: 15px; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap;
}
.campo { display: flex; flex-direction: column; }
.campo label { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
.campo select, .campo input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.btn-gerar { background: #2c3e50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
.btn-excel { background: #217346; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-left: auto;}

/* Hierarquia Visual */
.bloco-empresa { border: 2px solid #2c3e50; margin-bottom: 30px; border-radius: 5px; overflow: hidden; }
.header-empresa { background: #2c3e50; color: white; padding: 10px; font-size: 1.2rem; font-weight: bold; display: flex; justify-content: space-between; }

.bloco-setor { margin: 10px; border: 1px solid #999; border-radius: 4px; }
.header-setor { background: #e0e0e0; padding: 8px; font-weight: bold; display: flex; justify-content: space-between; color: #333;}

.bloco-dia { padding: 10px; }
.header-dia { font-style: italic; color: #666; margin-bottom: 5px; font-weight: bold; border-bottom: 1px solid #eee;}

/* Tabela */
.tabela-pedidos { width: 100%; border-collapse: collapse; font-size: 14px; }
.tabela-pedidos th { text-align: left; border-bottom: 1px solid #ddd; padding: 5px; color: #666; }
.tabela-pedidos td { padding: 5px; border-bottom: 1px solid #eee; }
.tabela-pedidos tr:last-child td { border-bottom: none; }

.sem-dados { text-align: center; color: #888; margin-top: 50px; }

@media print {
  .no-print { display: none; }
  .bloco-empresa { break-inside: avoid; } /* Tenta não quebrar empresa no meio da folha */
}
</style>