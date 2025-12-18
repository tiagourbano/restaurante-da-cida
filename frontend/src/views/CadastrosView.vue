<script setup>
import { ref, computed } from 'vue';
import api from '../services/api';

import CrudTamanhos from '../components/admin/CrudTamanhos.vue';
import CrudOpcoes from '../components/admin/CrudOpcoes.vue';
import CrudEmpresas from '../components/admin/CrudEmpresas.vue';
import CrudFuncionarios from '../components/admin/CrudFuncionarios.vue';
import CrudSetores from '../components/admin/CrudSetores.vue';
import CalendarioCardapio from '../components/admin/CalendarioCardapio.vue';
import CrudUsuarios from '../components/admin/CrudUsuarios.vue';

const abaAtiva = ref('cardapio');
const loading = ref(false);

// --- LÓGICA DO CARDÁPIO ---
const formCardapio = ref({
  dataServico: new Date().toISOString().split('T')[0], // Hoje
  pratoPrincipal: '',
  guarnicoes: ''
});

const salvarCardapio = async () => {
  if (!formCardapio.value.pratoPrincipal) return alert('Digite o prato principal');

  try {
    loading.value = true;
    await api.post('/admin/cardapio', formCardapio.value);
    alert('Cardápio salvo com sucesso!');
    // Limpa form ou mantém? Geralmente mantem a data pra tia saber que salvou
  } catch (error) {
    alert('Erro ao salvar cardápio.');
  } finally {
    loading.value = false;
  }
};

// --- LÓGICA DE FUNCIONÁRIOS ---
const arquivoExcel = ref(null);

const onFileChange = (e) => {
  arquivoExcel.value = e.target.files[0];
};

const importarFuncionarios = async () => {
  if (!arquivoExcel.value) return alert('Selecione um arquivo Excel (.xlsx)');

  const formData = new FormData();
  formData.append('arquivo', arquivoExcel.value);

  try {
    loading.value = true;
    const res = await api.post('/admin/importar-funcionarios', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    alert(res.data.message);
    arquivoExcel.value = null; // Limpa input
  } catch (error) {
    alert('Erro na importação. Verifique se o Excel tem as colunas: NOME, RA, EMPRESA, SETOR');
  } finally {
    loading.value = false;
  }
};

// --- LÓGICA DE HORÁRIOS ---
const setores = ref([]);
const empresasAbertasHorario = ref(new Set());
// Variavel temporaria para inputs de novo horario
// Usamos um objeto onde a chave é o ID do setor para controlar inputs independentes
const novosHorarios = ref({});

const carregarSetoresComHorarios = async () => {
  try {
    const res = await api.get('/admin/setores/horarios');
    setores.value = res.data;

    res.data.forEach(setor => {
      novosHorarios.value[setor.id] = {
        inicio: null,
        fim: null,
        descricao: null,
      };
    })

    // Opcional: Abrir todas as empresas por padrão ao carregar
    // setores.value.forEach(s => empresasAbertasHorario.value.add(s.empresaId));
  } catch (error) {
    alert('Erro ao carregar setores.');
  }
};

const setoresAgrupados = computed(() => {
  const grupos = {};

  setores.value.forEach(setor => {
    // Se a empresa ainda não existe no grupo, cria
    if (!grupos[setor.empresaId]) {
      grupos[setor.empresaId] = {
        empresaId: setor.empresaId,
        empresaNome: setor.empresaNome,
        listaSetores: []
      };
    }
    // Adiciona o setor na lista da empresa dele
    grupos[setor.empresaId].listaSetores.push(setor);
  });

  return grupos;
});

const toggleEmpresaHorario = (empresaId) => {
  if (empresasAbertasHorario.value.has(empresaId)) {
    empresasAbertasHorario.value.delete(empresaId);
  } else {
    empresasAbertasHorario.value.add(empresaId);
  }
};

const adicionarHorario = async (setorId) => {
  const input = novosHorarios.value[setorId] || {};
  console.log(novosHorarios.value);

  if (!input.inicio || !input.fim) return alert('Preencha inicio e fim');

  try {
    await api.post('/admin/setores/horarios', {
      setorId,
      horaInicio: input.inicio,
      horaFim: input.fim,
      descricao: input.descricao || 'Turno'
    });

    // Limpa input e recarrega lista
    novosHorarios.value[setorId] = {};
    await carregarSetoresComHorarios();
  } catch (error) {
    alert('Erro ao adicionar.');
  }
};

const removerHorario = async (horarioId) => {
  if (!confirm('Remover este horário?')) return;
  try {
    await api.delete(`/admin/setores/horarios/${horarioId}`);
    await carregarSetoresComHorarios();
  } catch (error) {
    alert('Erro ao remover.');
  }
};

// Quando clicar na aba, carrega os dados
const mudarAba = (aba) => {
  abaAtiva.value = aba;
  if (aba === 'horarios') {
    carregarSetoresComHorarios();
  }
};
</script>

<template>
  <div class="cadastros-container">
    <h1>Administração</h1>

    <div class="abas-nav">
      <button :class="{ ativo: abaAtiva === 'cardapio' }" @click="mudarAba('cardapio')">📅 Cardápio</button>
      <button :class="{ ativo: abaAtiva === 'tamanhos' }" @click="mudarAba('tamanhos')">📏 Tamanhos</button>
      <button :class="{ ativo: abaAtiva === 'opcoes' }" @click="mudarAba('opcoes')">➕ Opções Extras</button>
      <button :class="{ ativo: abaAtiva === 'empresas' }" @click="mudarAba('empresas')">🏢 Empresas</button>
      <button :class="{ ativo: abaAtiva === 'setores' }" @click="mudarAba('setores')">🏭 Setores</button>
      <button :class="{ ativo: abaAtiva === 'horarios' }" @click="mudarAba('horarios')">⏰ Horários/Setores</button>
      <button :class="{ ativo: abaAtiva === 'usuarios' }" @click="mudarAba('usuarios')">🔐 Usuários do Sistema</button>
      <button :class="{ ativo: abaAtiva === 'funcionarios' }" @click="mudarAba('funcionarios')">👥 Funcionários</button>
      <button :class="{ ativo: abaAtiva === 'importarFuncionarios' }" @click="mudarAba('importarFuncionarios')">👥 Importar Funcionários</button>
    </div>

    <div v-if="abaAtiva === 'cardapio1'" class="painel">
      <h2>Definir Cardápio do Dia</h2>

      <div class="form-group">
        <label>Data:</label>
        <input type="date" v-model="formCardapio.dataServico">
      </div>

      <div class="form-group">
        <label>Prato Principal:</label>
        <input type="text" v-model="formCardapio.pratoPrincipal" placeholder="Ex: Feijoada Completa">
      </div>

      <div class="form-group">
        <label>Guarnições (O que acompanha):</label>
        <input type="text" v-model="formCardapio.guarnicoes" placeholder="Ex: Arroz, Couve, Farofa, Laranja">
      </div>

      <button @click="salvarCardapio" :disabled="loading" class="btn-salvar">
        Salvar Cardápio
      </button>
    </div>

    <div v-if="abaAtiva === 'importarFuncionarios'" class="painel">
      <h2>Importar Funcionários (Excel)</h2>
      <p>O arquivo deve ter as colunas: <strong>NOME, RA, EMPRESA, SETOR</strong></p>

      <div class="upload-box">
        <input type="file" @change="onFileChange" accept=".xlsx, .xls">
      </div>

      <button @click="importarFuncionarios" :disabled="loading" class="btn-salvar">
        Processar Arquivo
      </button>
    </div>

    <div v-if="abaAtiva === 'horarios'" class="painel">
      <h2>Configurar Horários por Setor</h2>
      <p style="margin-bottom: 20px; color: #666;">
        Defina em quais horários os funcionários de cada setor podem pedir.
      </p>

      <div v-if="setores.length === 0" class="loading">Carregando setores...</div>

      <div v-else class="lista-sanfona">
        <div v-for="(grupo, idEmpresa) in setoresAgrupados" :key="idEmpresa" class="grupo-empresa">
          <div class="empresa-header" @click="toggleEmpresaHorario(Number(idEmpresa))">
            <h3>🏢 {{ grupo.empresaNome }}</h3>
            <span class="seta">{{ empresasAbertasHorario.has(Number(idEmpresa)) ? '▼' : '▶' }}</span>
          </div>

          <div v-if="empresasAbertasHorario.has(Number(idEmpresa))" class="empresa-body">
            <div class="grid-setores">
              <div v-for="setor in grupo.listaSetores" :key="setor.id" class="card-setor">
                <div class="card-titulo">
                  <strong>{{ setor.nome }}</strong>
                </div>
                <div class="card-body">
                  <div v-if="setor.horarios.length > 0" class="lista-horarios">
                    <div v-for="h in setor.horarios" :key="h.id" class="badge-horario">
                      <span>{{ h.horaInicio.slice(0,5) }} até {{ h.horaFim.slice(0,5) }}</span>
                      <small>({{ h.descricao }})</small>
                      <button @click="removerHorario(h.id)" class="btn-trash" title="Remover">🗑️</button>
                    </div>
                  </div>
                  <div v-else class="aviso-vazio">
                    ⚠️ Sem horários definidos (Ninguém desse setor consegue pedir).
                  </div>

                  <hr>

                  <div class="form-add">
                    <div class="inputs-hora">
                      <input type="time" v-model="novosHorarios[setor.id].inicio" title="Início">
                      <span>até</span>
                      <input type="time" v-model="novosHorarios[setor.id].fim" title="Fim">
                    </div>
                    <div class="input-desc-row">
                      <input type="text" v-model="novosHorarios[setor.id].descricao" placeholder="Desc. (Ex: Tarde)" class="input-desc">
                      <button @click="adicionarHorario(setor.id)" class="btn-add">+</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CalendarioCardapio v-if="abaAtiva === 'cardapio'" />
    <CrudTamanhos v-if="abaAtiva === 'tamanhos'" />
    <CrudOpcoes v-if="abaAtiva === 'opcoes'" />
    <CrudEmpresas v-if="abaAtiva === 'empresas'" />
    <CrudSetores v-if="abaAtiva === 'setores'" />
    <CrudFuncionarios v-if="abaAtiva === 'funcionarios'" />
    <CrudUsuarios v-if="abaAtiva === 'usuarios'" />

  </div>
</template>

<style scoped>
.cadastros-container { max-width: 1000px; margin: 0 auto; padding: 20px; }

/* Abas */
.abas-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  border-bottom: 3px solid #42b983;
  margin-bottom: 20px;
}
.abas-nav button {
  background: #f0f0f0;
  border: none;
  padding: 10px 15px;
  cursor: pointer;
  font-size: 14px;
  border-radius: 5px 5px 0 0;
}
.abas-nav button.ativo {
  background: #42b983;
  color: white;
  font-weight: bold;
}
.btn-voltar { margin-left: auto; text-decoration: none; padding: 10px; color: #555; }

/* Painéis */
.painel { background: #f9f9f9; padding: 30px; border-radius: 10px; border: 1px solid #eee; }
.form-group { margin-bottom: 15px; display: flex; flex-direction: column; }
.form-group label { font-weight: bold; margin-bottom: 5px; }
.form-group input { padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 5px; }

.btn-salvar {
  background-color: #2c3e50; color: white; padding: 15px; width: 100%; font-size: 18px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;
}
.btn-salvar:disabled { opacity: 0.6; }
.upload-box { border: 2px dashed #ccc; padding: 40px; text-align: center; background: white; margin-bottom: 20px; }


.painel-horarios { margin-top: 20px; }
.header-painel { margin-bottom: 20px; color: #555; }

.grupo-empresa {
    border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px; background: white; overflow: hidden;
}
.empresa-header {
    background: #2c3e50; color: white; padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;
}
.empresa-header:hover { background: #34495e; }
.empresa-body { padding: 20px; background: #f9f9f9; border-top: 1px solid #eee; }

/* Grid de Setores */
.grid-setores {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 15px;
}

/* Card do Setor */
.card-setor {
    background: white; border: 1px solid #e0e0e0; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.card-titulo {
    background: #e0f2f1; padding: 10px; border-bottom: 1px solid #eee; color: #00695c; text-align: center;
}
.card-miolo { padding: 10px; }

/* Tags de Horario */
.lista-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.tag-horario {
    background: #e8f5e9; border: 1px solid #c8e6c9; padding: 4px 8px; border-radius: 15px; font-size: 0.85rem; display: flex; align-items: center; gap: 5px;
}
.btn-x { background: none; border: none; color: red; font-weight: bold; cursor: pointer; font-size: 1.1em; line-height: 1; }
.aviso-vazio { font-size: 0.8rem; color: #999; font-style: italic; text-align: center; margin-bottom: 10px;}

/* Formulariozinho */
.form-add { display: flex; flex-direction: column; gap: 5px; }
.inputs-hora { display: flex; align-items: center; gap: 5px; justify-content: center; font-size: 0.9rem;}
.inputs-hora input { padding: 3px; border: 1px solid #ccc; border-radius: 4px; }
.input-desc-row { display: flex; gap: 5px; }
.input-desc-row input { flex: 1; padding: 5px; border: 1px solid #ccc; border-radius: 4px; }
.btn-plus { background: #42b983; color: white; border: none; width: 30px; border-radius: 4px; cursor: pointer; font-weight: bold; }

/* Estilos Específicos da Aba de Horários */
.lista-setores {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); /* Grade responsiva */
  gap: 20px;
}

.card-setor {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.card-header {
  background: #2c3e50;
  color: white;
  padding: 10px;
  font-size: 14px;
}

.card-body {
  padding: 15px;
}

.badge-horario {
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.btn-trash {
  background: none; border: none; cursor: pointer; font-size: 12px;
}

.aviso-vazio { color: orange; font-size: 12px; font-style: italic; margin-bottom: 10px; }

.form-novo-horario {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
}

.form-novo-horario input[type=time] {
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.input-desc { width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px; }

.btn-add {
  background: #42b983; color: white; border: none; width: 30px; height: 30px; border-radius: 50%; font-weight: bold; cursor: pointer;
}
</style>