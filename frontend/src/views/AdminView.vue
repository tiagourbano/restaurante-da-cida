<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import api from '../services/api';
import Etiqueta from '../components/Etiqueta.vue';
import EditarPedidoModal from '../components/admin/EditarPedidoModal.vue';
import ResumoImpressao from '../components/admin/ResumoImpressao.vue';
import NovoPedidoAdminModal from '../components/admin/NovoPedidoAdminModal.vue';

const vIndeterminate = {
  mounted(el, binding) {
    el.indeterminate = Boolean(binding.value);
  },
  updated(el, binding) {
    el.indeterminate = Boolean(binding.value);
  }
};

const pedidosRaw = ref([]);
const loading = ref(true);
const pedidoParaEditar = ref(null);
const modalNovoPedidoAberto = ref(false);

// --- DADOS ESTRUTURAIS (Para popular os selects) ---
const dadosHierarquicos = ref([]); // Guarda a arvore completa: Empresa -> Setores -> Horarios

// --- FILTROS ---
const filtros = ref({
  data: new Date().toISOString().split('T')[0],
  empresaId: '',
  setorId: '',
  janelaSelecionada: '', // String JSON {inicio, fim}
  statusEtiqueta: 'todos' // 'todos', 'pendentes', 'impressos'
});

// Limpa os filtros filhos quando o pai muda
watch(() => filtros.value.empresaId, () => {
  filtros.value.setorId = '';
  filtros.value.janelaSelecionada = '';
});

watch(() => filtros.value.setorId, () => {
  filtros.value.janelaSelecionada = '';
});

watch(() => filtros.value.data, () => {
  carregarDados();
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
        api.get(`/admin/pedidos?data=${filtros.value.data}`),
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

    // 4. Filtro Status de Impressão da Etiqueta
    if (filtros.value.statusEtiqueta === 'pendentes' && p.etiquetaImpressa) {
       return false;
    }
    if (filtros.value.statusEtiqueta === 'impressos' && !p.etiquetaImpressa) {
       return false;
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

// --- LÓGICA DE STATUS DE IMPRESSÃO ---
const marcarEtiquetaIndividual = async (pedido, statusDesejado) => {
  const antigo = pedido.etiquetaImpressa;
  pedido.etiquetaImpressa = statusDesejado;

  try {
    await api.patch(`/admin/pedidos/${pedido.pedidoId}/etiqueta`, {
      etiquetaImpressa: statusDesejado
    });
  } catch (error) {
    console.error('Erro ao atualizar status da etiqueta:', error);
    pedido.etiquetaImpressa = antigo;
    alert('Erro ao salvar status da etiqueta.');
  }
};

const marcarEtiquetasSetor = async (pedidosDoSetor, marcarComo) => {
  const pedidosAlterar = pedidosDoSetor.filter(p => !!p.etiquetaImpressa !== marcarComo);
  if (pedidosAlterar.length === 0) return;

  const backup = pedidosAlterar.map(p => ({ pedido: p, status: p.etiquetaImpressa }));
  pedidosAlterar.forEach(p => { p.etiquetaImpressa = marcarComo; });

  try {
    await api.patch('/admin/pedidos/etiquetas-lote', {
      pedidoIds: pedidosAlterar.map(p => p.pedidoId),
      etiquetaImpressa: marcarComo
    });
  } catch (error) {
    console.error('Erro ao atualizar status do lote:', error);
    backup.forEach(b => { b.pedido.etiquetaImpressa = b.status; });
    alert('Erro ao atualizar status das etiquetas em lote.');
  }
};

const toggleSetorCheckbox = async (setor) => {
  const todosMarcados = setor.pedidos.length > 0 && setor.pedidos.every(p => p.etiquetaImpressa);
  const novoStatus = !todosMarcados;
  await marcarEtiquetasSetor(setor.pedidos, novoStatus);
};

const getSetorCheckboxState = (pedidos) => {
  if (!pedidos || pedidos.length === 0) return { checked: false, indeterminate: false };
  const impressos = pedidos.filter(p => p.etiquetaImpressa).length;
  if (impressos === 0) return { checked: false, indeterminate: false };
  if (impressos === pedidos.length) return { checked: true, indeterminate: false };
  return { checked: false, indeterminate: true };
};

// --- LÓGICA DE IMPRESSÃO ---
const imprimirLote = async (pedidosParaImprimir, marcarAutomatico = true) => {
  if (!pedidosParaImprimir || pedidosParaImprimir.length === 0) return;

  loteParaImpressao.value = pedidosParaImprimir;
  isImprimindo.value = true;
  await nextTick();
  window.print();
  setTimeout(() => { isImprimindo.value = false; loteParaImpressao.value = []; }, 1000);

  if (marcarAutomatico) {
    const pendentes = pedidosParaImprimir.filter(p => !p.etiquetaImpressa);
    if (pendentes.length > 0) {
      marcarEtiquetasSetor(pendentes, true);
    }
  }
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
          <label>📅 Data de Produção:</label>
          <input type="date" v-model="filtros.data">
        </div>

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

         <div class="grupo-filtro">
            <label>🏷️ Status Etiquetas:</label>
            <div class="filtro-status-etiquetas">
               <button
                 type="button"
                 :class="['btn-status', { ativo: filtros.statusEtiqueta === 'todos' }]"
                 @click="filtros.statusEtiqueta = 'todos'"
               >Todos</button>
               <button
                 type="button"
                 :class="['btn-status btn-status-pendente', { ativo: filtros.statusEtiqueta === 'pendentes' }]"
                 @click="filtros.statusEtiqueta = 'pendentes'"
               >⏳ Pendentes</button>
               <button
                 type="button"
                 :class="['btn-status btn-status-impresso', { ativo: filtros.statusEtiqueta === 'impressos' }]"
                 @click="filtros.statusEtiqueta = 'impressos'"
               >✅ Impressos</button>
            </div>
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
                   <div class="setor-titulo-com-check">
                      <input
                        type="checkbox"
                        class="check-setor"
                        :checked="getSetorCheckboxState(set.pedidos).checked"
                        v-indeterminate="getSetorCheckboxState(set.pedidos).indeterminate"
                        @change="toggleSetorCheckbox(set)"
                        title="Marcar / Desmarcar todas do setor"
                      />
                      <h4>{{ set.setorNome }}</h4>
                   </div>
                   <small class="setor-subinfo">
                      {{ set.pedidos.length }} pedidos
                      <span class="status-contagem">
                        ({{ set.pedidos.filter(p => p.etiquetaImpressa).length }} impressos /
                        {{ set.pedidos.filter(p => !p.etiquetaImpressa).length }} pendentes)
                      </span>
                   </small>
                </div>
                <div class="setor-acoes">
                   <button
                     v-if="set.pedidos.some(p => !p.etiquetaImpressa) && set.pedidos.some(p => p.etiquetaImpressa)"
                     @click.stop="imprimirLote(set.pedidos.filter(p => !p.etiquetaImpressa))"
                     class="btn-imprimir-pendentes"
                     title="Imprimir apenas pedidos novos/pendentes"
                   >
                      ⚡ Pendentes ({{ set.pedidos.filter(p => !p.etiquetaImpressa).length }})
                   </button>
                   <button @click.stop="imprimirLote(set.pedidos)" class="btn-imprimir-lote" title="Imprimir todas as etiquetas do setor">
                      🖨️ Etiquetas (Todas)
                   </button>
                </div>
                <ul class="lista-nomes">
                  <li
                    v-for="p in set.pedidos"
                    :key="p.pedidoId"
                    :class="['item-pedido', p.etiquetaImpressa ? 'pedido-impresso' : 'pedido-pendente']"
                  >
                    <input
                      type="checkbox"
                      class="check-pedido"
                      :checked="!!p.etiquetaImpressa"
                      @change="marcarEtiquetaIndividual(p, $event.target.checked)"
                      :title="p.etiquetaImpressa ? 'Etiqueta já impressa (clique para desmarcar)' : 'Marcar como impressa'"
                    />
                    <span v-if="!p.etiquetaImpressa" class="badge-tag tag-pendente">Novo</span>
                    <span v-else class="badge-tag tag-impresso">✓</span>

                    <span v-if="p.isAniversariante" title="Aniversariante do Dia!" style="font-size: 1.2em; margin-right: 5px;">🎂</span>
                    <span class="nome-funcionario">{{ p.funcionarioNome }}</span> <span class="detalhe-tam">({{ p.tamanhoNome }})</span>
                    <span v-if="p.observacao || p.opcoesEscolhidasString" class="tem-obs">⚠️</span>
                    <button @click.stop="abrirEdicao(p.pedidoId)" class="btn-editar">✏️</button>
                    <button @click.stop="excluirPedido(p.pedidoId)" class="btn-acao excluir" title="Excluir">🗑️</button>
                    <button @click.stop="imprimirLote([p])" class="btn-acao imprimir" title="Imprimir Etiqueta Individual">🖨️</button>
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
.grupo-filtro input { padding: 8px; border-radius: 4px; border: 1px solid #ccc; }
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
.box-setor { margin-bottom: 15px; border: 1px solid #eee; padding: 12px; border-radius: 6px; }
.setor-info { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.setor-titulo-com-check { display: flex; align-items: center; gap: 8px; }
.setor-titulo-com-check h4 { margin: 0; font-size: 1.1rem; color: #2c3e50; }
.check-setor { width: 18px; height: 18px; cursor: pointer; accent-color: #27ae60; }
.setor-subinfo { color: #666; font-size: 0.85rem; }
.status-contagem { font-weight: 500; color: #555; margin-left: 4px; }
.setor-acoes { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }

.filtro-status-etiquetas { display: inline-flex; background: #e2e8f0; border-radius: 6px; padding: 2px; gap: 2px; }
.btn-status { border: none; background: transparent; padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.15s ease; }
.btn-status.ativo { background: white; color: #1e293b; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
.btn-status-pendente.ativo { color: #d97706; }
.btn-status-impresso.ativo { color: #16a34a; }

.btn-imprimir-pendentes { background: #e67e22; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(230, 126, 34, 0.3); }
.btn-imprimir-pendentes:hover { background: #d35400; }

.btn-imprimir-lote { background: #27ae60; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-imprimir-lote:hover { background: #219653; }

.lista-nomes { margin-top: 10px; list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; }
.lista-nomes li.item-pedido { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 6px; font-size: 0.9rem; border: 1px solid #e0e0e0; transition: all 0.2s ease; }
.item-pedido.pedido-pendente { background: #fffbeb; border-color: #fde68a; box-shadow: 0 1px 3px rgba(217, 119, 6, 0.08); }
.item-pedido.pedido-impresso { background: #f8fafc; border-color: #e2e8f0; opacity: 0.85; }
.item-pedido.pedido-impresso:hover { opacity: 1; }

.check-pedido { width: 16px; height: 16px; cursor: pointer; accent-color: #27ae60; }
.badge-tag { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; padding: 2px 5px; border-radius: 3px; letter-spacing: 0.5px; }
.tag-pendente { background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; }
.tag-impresso { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
.nome-funcionario { font-weight: 500; }
.btn-editar { border: none; background: none; cursor: pointer; margin-left: 2px; }
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
