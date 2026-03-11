<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../services/api';

const empresas = ref([]);
const disableEmpresas = ref(false);
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

  const usuarioRaw = localStorage.getItem('adminUser');
  const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;
  if (usuario.perfil === 'CLIENTE') {
    disableEmpresas.value = true;
    filtro.value.empresaId = usuario.empresaId
  }
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

const baixarExcel = async () => {
  // Para baixar arquivo, não usamos axios. Abrimos a URL em nova aba ou window.location
  // Precisamos montar a query string manualmente
  // const query = new URLSearchParams(filtro.value).toString();
  // window.open(`/api/admin/relatorio/excel?${query}`, '_blank');

  try {
    const query = new URLSearchParams(filtro.value).toString();

    // 1. Faz a requisição usando o Axios (que já coloca o Token no header)
    // IMPORTANTE: responseType: 'blob' diz ao Axios para não tentar ler como JSON
    const response = await api.get(`/admin/relatorio/excel?${query}`, {
      responseType: 'blob'
    });

    // 2. Cria um "objeto de arquivo" (Blob) com os dados recebidos
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // 3. Cria uma URL temporária na memória do navegador para esse arquivo
    const url = window.URL.createObjectURL(blob);

    // 4. Cria um link invisível <a>, clica nele e depois apaga
    const link = document.createElement('a');
    link.href = url;

    // Define o nome do arquivo que vai ser salvo no computador da sua tia
    link.setAttribute('download', 'fechamento_marmitas.xlsx');

    document.body.appendChild(link);
    link.click(); // Força o download

    // 5. Limpeza da memória
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Erro ao baixar Excel:', error);
    alert('Erro ao baixar o arquivo Excel. Verifique sua conexão.');
  }
};

// Formatação de Moeda
const toMoney = (val) => `R$ ${parseFloat(val).toFixed(2)}`;

const jsonToHtmlTable = (json) => {
  if (json.length === 0) {
    return 'No records';
  }
  let html = `<table>
    <thead>
      <tr>
        <th colspan="2">Total</th>
      </tr>
      <tr>
        <th>Tamanho</th>
        <th>Quantidade</th>
      </tr>
    </thead>`;
  html += '<tbody>';
  Object.keys(json).forEach((key) => {
    html += `<tr>`;
    html += ` <td>${key}</td>`;
    html += ` <td>${json[key]}</td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';

  return html;
};
</script>

<template>
  <div class="relatorio-container">
    <h1>Relatório de Fechamento</h1>

    <div class="filtros no-print">
      <div class="campo">
        <label>Empresa:</label>
        <select v-model="filtro.empresaId" :disabled="disableEmpresas">
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

        <div class="bloco-setor no-border">
          <div class="resumo-total-marmitas">
            <table v-html="jsonToHtmlTable(emp.totalMarmitas)"></table>
          </div>
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

<style>
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

.resumo-total-marmitas { width: fit-content; margin: 10px; border: 1px solid #999; border-radius: 4px; }
.resumo-total-marmitas table { width: 250px; border-collapse: collapse; font-size: 14px; }
.resumo-total-marmitas table tr { border-bottom: 1px solid #999; }
.resumo-total-marmitas table th { text-align: center; font-weight: 600; background-color: #ddd; padding: 10px; }
.resumo-total-marmitas td { text-align: center; padding: 10px 0; }
.bloco-setor.no-border { margin: 0; border: 0; display: flex; justify-content: center; }

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
