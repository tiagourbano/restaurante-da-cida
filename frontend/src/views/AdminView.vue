<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import api from '../services/api';
import Etiqueta from '../components/Etiqueta.vue';
import EditarPedidoModal from '../components/admin/EditarPedidoModal.vue';
import ResumoImpressao from '../components/admin/ResumoImpressao.vue';
import NovoPedidoAdminModal from '../components/admin/NovoPedidoAdminModal.vue';

const pedidosRaw = ref([]);
const loading = ref(true);
const pedidoParaEditar = ref(null);
const modalNovoPedidoAberto = ref(false);

// --- DADOS ESTRUTURAIS (Para popular os selects) ---
const dadosHierarquicos = ref([]); // Guarda a arvore completa: Empresa -> Setores -> Horarios

// --- FILTROS ---
const filtros = ref({
  empresaId: '',
  setorId: '',
  janelaSelecionada: '' // String JSON {inicio, fim}
});

// Limpa os filtros filhos quando o pai muda
watch(() => filtros.value.empresaId, () => {
  filtros.value.setorId = '';
  filtros.value.janelaSelecionada = '';
});

watch(() => filtros.value.setorId, () => {
  filtros.value.janelaSelecionada = '';
});

// --- COMPUTEDS PARA OS DROPDOWNS DINÂMICOS ---

// 1. Lista de Empresas (Extraída dos dados hierarquicos ou carregada a parte)
const listaEmpresas = computed(() => {
    // Retorna array simples de empresas unicas
    const map = new Map();
    dadosHierarquicos.value.forEach(item => {
        // item pode ser um setor (dependendo da sua API /admin/setores).
        // Vamos assumir que /admin/setores retorna lista de SETORES com dados da empresa,
        // ou lista de EMPRESAS com setores. Vou assumir o formato agrupado que fizemos no passo anterior.
        // Se sua API /admin/setores retorna agrupado (Empresa -> listaSetores), use:
        if(item.empresaId) {
             map.set(item.empresaId, { id: item.empresaId, nome: item.empresaNome });
        }
    });
    return Array.from(map.values());
});

// 2. Lista de Setores (Depende da Empresa selecionada)
const opcoesSetores = computed(() => {
    if (!filtros.value.empresaId) return [];

    // Filtra na hierarquia os setores desta empresa
    // Supondo que dadosHierarquicos seja a lista plana de setores ou agrupada.
    // Vou usar a lógica baseada no retorno que fizemos em "SetorController.listarComHorarios"
    // que retorna agrupado por empresa no controller, mas achatado no JSON?
    // Vamos ajustar no carregarDados para garantir.

    // Se dadosHierarquicos for [{ empresaId: 1, listaSetores: [...] }]
    const empresaEncontrada = dadosHierarquicos.value.filter(e => e.empresaId === filtros.value.empresaId);
    return empresaEncontrada ? empresaEncontrada : [];
});

// 3. Lista de Janelas (Depende da Empresa E (opcionalmente) do Setor)
const opcoesJanelas = computed(() => {
    if (!filtros.value.empresaId) return [];

    const janelasMap = new Map();

    // Função auxiliar para adicionar ao map
    const addJanela = (h) => {
        const key = `${h.horaInicio}-${h.horaFim}`;
        if (!janelasMap.has(key)) {
            janelasMap.set(key, {
                label: `${h.horaInicio.slice(0,5)} às ${h.horaFim.slice(0,5)} (${h.descricao})`,
                inicio: h.horaInicio,
                fim: h.horaFim
            });
        }
    };

    if (filtros.value.setorId) {
        // CASO 1: Filtrar janelas só deste setor
        const setor = opcoesSetores.value.find(s => s.id === filtros.value.setorId);
        if (setor && setor.horarios) {
            setor.horarios.forEach(addJanela);
        }
    } else {
        // CASO 2: Filtrar janelas de TODOS os setores da empresa selecionada
        opcoesSetores.value.forEach(setor => {
            if (setor.horarios) {
                setor.horarios.forEach(addJanela);
            }
        });
    }

    // Ordena por horario
    return Array.from(janelasMap.values()).sort((a,b) => a.inicio.localeCompare(b.inicio));
});


// --- STATE VISUAL ---
const loteParaImpressao = ref([]);
const isImprimindo = ref(false);
const resumoParaImpressao = ref(null);
const tituloResumoImpressao = ref('');
const isImprimindoResumo = ref(false);
const modoVisualizacao = ref('lista');
const empresasAbertas = ref(new Set());

const toggleEmpresa = (empresaId) => {
  if (empresasAbertas.value.has(empresaId)) empresasAbertas.value.delete(empresaId);
  else empresasAbertas.value.add(empresaId);
};

// --- CARREGAR DADOS ---
const carregarDados = async () => {
  loading.value = true;
  try {
    const [resPedidos, resSetores] = await Promise.all([
        api.get('/admin/pedidos'),
        api.get('/admin/setores/horarios') // Rota que retorna estrutura hierarquica (Empresa -> Setores -> Horarios)
    ]);

    pedidosRaw.value = resPedidos.data;

    // AQUI É IMPORTANTE: Sua rota /admin/setores no backend deve retornar
    // aquele formato agrupado que fizemos na tela de cadastros.
    // Se ela retornar plano, precisamos agrupar aqui.
    // Vou assumir que ela retorna o formato: { '1': { empresaId:1, listaSetores:[...] } } (Objeto)
    // OU array de objetos. Vamos converter objeto para array se necessario.

    const dados = resSetores.data;
    if (Array.isArray(dados)) {
        dadosHierarquicos.value = dados;
    } else {
        // Se vier como objeto (keys sendo ids), transforma em array
        dadosHierarquicos.value = Object.values(dados);
    }

  } catch (error) {
    console.error(error);
    alert('Erro ao carregar dados.');
  } finally {
    loading.value = false;
  }
};

// --- COMPUTED: FILTRAGEM DE PEDIDOS ---
const pedidosFiltrados = computed(() => {
  return pedidosRaw.value.filter(p => {

    // 1. Filtro Empresa
    if (filtros.value.empresaId && p.empresaId !== filtros.value.empresaId) {
       return false;
    }

    // 2. Filtro Setor (NOVO) - Compara pelo Nome (preferencialmente ID se o pedido tiver setorId)
    // O endpoint /admin/pedidos retorna 'setorNome', vamos usar isso ou ID se tiver.
    if (filtros.value.setorId) {
        // Precisamos achar o nome do setor selecionado no select para comparar
        const setorSelecionado = opcoesSetores.value.find(s => s.id === filtros.value.setorId);
        if (setorSelecionado && p.setorNome !== setorSelecionado.nome) {
            return false;
        }
    }

    // 3. Filtro Janela
    if (filtros.value.janelaSelecionada) {
       const janela = JSON.parse(filtros.value.janelaSelecionada);

       const dataPedido = new Date(p.dataPedido);
       const horaPedidoStr = dataPedido.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

       if (horaPedidoStr < janela.inicio.slice(0,5) || horaPedidoStr > janela.fim.slice(0,5)) {
          return false;
       }
    }

    return true;
  });
});

// --- AGRUPAMENTO (Baseado nos Filtrados) ---
const pedidosAgrupados = computed(() => {
  const grupos = [];
  pedidosFiltrados.value.forEach(p => {
    let emp = grupos.find(g => g.empresaNome === p.empresaNome);
    if (!emp) {
      emp = { id: p.empresaId || p.empresaNome, empresaNome: p.empresaNome, totalMarmitas: 0, setores: [] };
      grupos.push(emp);
    }
    let set = emp.setores.find(s => s.setorNome === p.setorNome);
    if (!set) {
      set = { setorNome: p.setorNome, pedidos: [] };
      emp.setores.push(set);
    }
    set.pedidos.push(p);
    emp.totalMarmitas++;
  });
  return grupos;
});

// --- LÓGICA DE IMPRESSÃO ---
const imprimirLote = async (pedidosDoSetor) => {
  loteParaImpressao.value = pedidosDoSetor;
  isImprimindo.value = true;
  await nextTick();
  window.print();
  setTimeout(() => { isImprimindo.value = false; loteParaImpressao.value = []; }, 1000);
};

const imprimirResumo = async (titulo, dadosTotais) => {
  tituloResumoImpressao.value = titulo;
  resumoParaImpressao.value = dadosTotais;
  isImprimindoResumo.value = true;
  await nextTick();
  window.print();
  setTimeout(() => { isImprimindoResumo.value = false; resumoParaImpressao.value = null; }, 1000);
};

// --- CÁLCULO TOTAIS ---
const calcularTotais = (listaPedidos) => {
  const stats = { tamanhos: {}, trocas: {}, extras: {} };
  listaPedidos.forEach(p => {
    stats.tamanhos[p.tamanhoNome] = (stats.tamanhos[p.tamanhoNome] || 0) + 1;
    if (p.opcoesEscolhidasString) {
      const opcoes = p.opcoesEscolhidasString.split(' + ');
      opcoes.forEach(op => {
        if (op.toLowerCase().includes('troc')) stats.trocas[op] = (stats.trocas[op] || 0) + 1;
        else stats.extras[op] = (stats.extras[op] || 0) + 1;
      });
    }
  });
  return stats;
};

const dadosResumoCozinha = computed(() => {
  const estrutura = [];
  pedidosAgrupados.value.forEach(emp => {
    const empresaStats = {
      id: emp.id,
      nome: emp.empresaNome,
      totaisGerais: calcularTotais(emp.setores.flatMap(s => s.pedidos)),
      setores: []
    };
    emp.setores.forEach(set => {
      empresaStats.setores.push({ nome: set.setorNome, totais: calcularTotais(set.pedidos) });
    });
    estrutura.push(empresaStats);
  });
  return estrutura;
});

const abrirEdicao = (pedidoId) => { pedidoParaEditar.value = pedidoId; };
const aoSalvarEdicao = () => { pedidoParaEditar.value = null; carregarDados(); };
const aoSalvarNovoPedido = () => { modalNovoPedidoAberto.value = false; carregarDados(); };

const excluirPedido = async (pedidoId) => {
  if(!confirm('Tem certeza que deseja excluir este pedido?')) return;

  try {
    await api.delete(`/admin/pedidos/${pedidoId}`);
    // Recarrega a lista
    carregarDados();
  } catch (error) {
    alert('Erro ao excluir pedido.');
  }
};

onMounted(carregarDados);
</script>

<template>
  <div class="expedicao-container">

    <header class="no-print">
      <div class="header-top">
        <h1>Expedição</h1>
        <div class="totais-info">
             Exibindo: <strong>{{ pedidosFiltrados.length }}</strong> de {{ pedidosRaw.length }}
        </div>
      </div>

      <div class="barra-filtros">

         <div class="grupo-filtro">
            <label>1. Empresa:</label>
            <select v-model="filtros.empresaId">
               <option value="">Selecione...</option>
               <option v-for="e in listaEmpresas" :key="e.id" :value="e.id">
                  {{ e.nome }}
               </option>
            </select>
         </div>

         <div class="grupo-filtro">
            <label>2. Setor (Opcional):</label>
            <select v-model="filtros.setorId" :disabled="!filtros.empresaId">
               <option value="">Todos os Setores</option>
               <option v-for="s in opcoesSetores" :key="s.id" :value="s.id">
                  {{ s.nome }}
               </option>
            </select>
         </div>

         <div class="grupo-filtro">
            <label>3. Janela / Turno:</label>
            <select v-model="filtros.janelaSelecionada" :disabled="!filtros.empresaId">
               <option value="">Todos os Horários</option>
               <option v-for="(j, idx) in opcoesJanelas" :key="idx" :value="JSON.stringify({inicio: j.inicio, fim: j.fim})">
                  {{ j.label }}
               </option>
            </select>
         </div>

         <div class="separador"></div>

         <div class="switch-mode">
           <button :class="{ ativo: modoVisualizacao === 'lista' }" @click="modoVisualizacao = 'lista'">📦 Lista</button>
           <button :class="{ ativo: modoVisualizacao === 'resumo' }" @click="modoVisualizacao = 'resumo'">🍳 Totais</button>
         </div>

         <button @click="carregarDados" class="btn-refresh" title="Atualizar">🔄</button>
         <button @click="modalNovoPedidoAberto = true" class="btn-manual no-print" title="Fazer pedido para funcionário">
            ➕ Pedido Manual
         </button>
      </div>
    </header>

    <div v-if="loading" class="loading no-print">Carregando pedidos...</div>

    <div v-else-if="modoVisualizacao === 'lista'" class="lista-visual no-print">
       <div v-for="emp in pedidosAgrupados" :key="emp.empresaNome" class="card-empresa">
          <div class="empresa-header" @click="toggleEmpresa(emp.id)">
             <div class="titulo">
                <span class="seta">{{ empresasAbertas.has(emp.id) ? '▼' : '▶' }}</span>
                <h3>{{ emp.empresaNome }}</h3>
             </div>
             <span class="badge-total">{{ emp.totalMarmitas }} un</span>
          </div>

          <div v-if="empresasAbertas.has(emp.id)" class="empresa-body">
             <div v-for="set in emp.setores" :key="set.setorNome" class="box-setor">
                <div class="setor-info">
                   <h4>{{ set.setorNome }}</h4>
                   <small>{{ set.pedidos.length }} pedidos</small>
                </div>
                <div class="setor-acoes">
                   <button @click.stop="imprimirLote(set.pedidos)" class="btn-imprimir-lote">
                      🖨️ Etiquetas
                   </button>
                </div>
                <ul class="lista-nomes">
                  <li v-for="p in set.pedidos" :key="p.pedidoId">
                    <span v-if="p.isAniversariante" title="Aniversariante do Dia!" style="font-size: 1.2em; margin-right: 5px;">🎂</span>
                    {{ p.funcionarioNome }} <span class="detalhe-tam">({{ p.tamanhoNome }})</span>
                    <span v-if="p.observacao || p.opcoesEscolhidasString" class="tem-obs">⚠️</span>
                    <button @click.stop="abrirEdicao(p.pedidoId)" class="btn-editar">✏️</button>
                    <button @click.stop="excluirPedido(p.pedidoId)" class="btn-acao excluir" title="Excluir">🗑️</button>
                  </li>
                </ul>
             </div>
          </div>
       </div>
       <div v-if="pedidosFiltrados.length === 0" class="sem-pedidos">Nenhum pedido encontrado.</div>
    </div>

    <div v-else class="resumo-visual no-print">
       <div v-for="emp in dadosResumoCozinha" :key="emp.id" class="card-resumo">
          <div class="resumo-header">
             <div class="info">
                <h3>🏭 {{ emp.nome }}</h3>
                <small>Total Filtrado: {{ Object.values(emp.totaisGerais.tamanhos).reduce((a,b)=>a+b,0) }} un</small>
             </div>
             <button @click="imprimirResumo(`Resumo: ${emp.nome}`, emp.totaisGerais)" class="btn-print-cozinha">
                🖨️ Resumo
             </button>
          </div>
          <div class="resumo-detalhe-empresa">
             <div v-for="set in emp.setores" :key="set.nome" class="box-setor-cozinha">
                <div class="setor-header-cozinha">
                   <div class="titulo-setor"><strong>{{ set.nome }}</strong></div>
                   <button @click="imprimirResumo(`${set.nome}`, set.totais)" class="btn-print-mini">🖨️ Setor</button>
                </div>
                <table class="tabela-cozinha">
                    <thead><tr><th>Item</th><th class="col-qtd">Qtd</th></tr></thead>
                    <tbody>
                        <tr v-for="(qtd, tam) in set.totais.tamanhos" :key="tam" class="row-tam"><td>{{ tam }}</td><td class="col-qtd">{{ qtd }}</td></tr>
                        <tr v-for="(qtd, tr) in set.totais.trocas" :key="tr" class="row-troca"><td>Troca: {{ tr }}</td><td class="col-qtd">{{ qtd }}</td></tr>
                        <tr v-for="(qtd, ext) in set.totais.extras" :key="ext" class="row-extra"><td>{{ ext }}</td><td class="col-qtd">{{ qtd }}</td></tr>
                    </tbody>
                </table>
             </div>
          </div>
       </div>
       <div v-if="dadosResumoCozinha.length === 0" class="sem-pedidos">Nada para cozinhar.</div>
    </div>

    <div class="area-impressao-real" v-if="isImprimindo"><Etiqueta v-for="p in loteParaImpressao" :key="p.pedidoId" :pedido="p" /></div>
    <div class="area-impressao-real" v-if="isImprimindoResumo"><ResumoImpressao :titulo="tituloResumoImpressao" :resumo="resumoParaImpressao" /></div>
    <EditarPedidoModal v-if="pedidoParaEditar" :pedidoId="pedidoParaEditar" @close="pedidoParaEditar = null" @salvo="aoSalvarEdicao" />
    <NovoPedidoAdminModal v-if="modalNovoPedidoAberto" @close="modalNovoPedidoAberto = false" @salvo="aoSalvarNovoPedido" />

  </div>
</template>

<style scoped>
/* --- ESTILOS VISUAIS (TELA) - MANTIDOS --- */
.expedicao-container { max-width: 1000px; margin: 0 auto; padding: 20px; }
.header-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
h1 { margin: 0; color: #2c3e50; font-size: 1.8rem; }
.barra-filtros { background: #f1f3f5; padding: 10px 15px; border-radius: 8px; display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 20px; }
.grupo-filtro { display: flex; flex-direction: column; gap: 5px; }
.grupo-filtro label { font-size: 0.8rem; font-weight: bold; color: #555; }
.grupo-filtro select { padding: 8px; border-radius: 4px; border: 1px solid #ccc; min-width: 150px; }
.grupo-filtro select:disabled { background: #e9ecef; cursor: not-allowed; color: #999; }
.separador { width: 1px; background: #ccc; height: 30px; margin: 0 10px; }
.switch-mode { display: flex; background: #ddd; border-radius: 20px; padding: 3px; gap: 5px; }
.switch-mode button { border: none; background: transparent; padding: 6px 15px; border-radius: 15px; cursor: pointer; font-weight: bold; color: #555; }
.switch-mode button.ativo { background: white; color: #2c3e50; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.btn-refresh { background: #2c3e50; color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; margin-left: auto; display: flex; justify-content: center; align-items: center; font-size: 1.2rem; }
.btn-manual { background: #e67e22; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;}
.card-empresa { border: 1px solid #ddd; margin-bottom: 15px; border-radius: 8px; background: white; overflow: hidden; }
.empresa-header { padding: 15px; background: #f8f9fa; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.empresa-body { padding: 15px; border-top: 1px solid #eee; }
.box-setor { margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 6px; }
.lista-nomes { margin-top: 10px; list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; }
.lista-nomes li { background: #f5f5f5; padding: 4px 10px; border-radius: 4px; font-size: 0.9rem; }
.btn-editar { border: none; background: none; cursor: pointer; margin-left: 5px; }
.btn-imprimir-lote { background: #42b983; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.card-resumo { margin-bottom: 20px; border: 1px solid #ccc; border-radius: 8px; background: white; overflow: hidden; }
.resumo-header { background: #fff3e0; padding: 15px; display: flex; justify-content: space-between; }
.box-setor-cozinha { margin: 10px; border: 1px solid #eee; border-radius: 6px; }
.tabela-cozinha { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.tabela-cozinha td, .tabela-cozinha th { padding: 8px; border-bottom: 1px solid #eee; }
.col-qtd { width: 50px; text-align: center; font-weight: bold; background: #fafafa; }
.row-tam { color: #1565c0; }
.row-troca { color: #e65100; background: #fff8e1; }
.row-extra { color: #b71c1c; }

/* --- CSS DE IMPRESSÃO (A CORREÇÃO NUCLEAR) --- */
@media print {
  /* 1. Esconde TUDO que não seja a área de impressão */
  .no-print,
  .expedicao-container > *:not(.area-impressao-real) {
    display: none !important;
  }

  /* 2. Zera o container principal para ele não ocupar espaço fantasma */
  .expedicao-container {
    margin: 0 !important;
    padding: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    border: none !important;
    max-width: none !important;
  }

  /* 3. Posiciona a área de impressão no TOPO ABSOLUTO */
  .area-impressao-real {
    display: block !important;
    position: absolute; /* Tira do fluxo e joga pro topo */
    top: 0;
    left: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    background: white;
  }
}
</style>
