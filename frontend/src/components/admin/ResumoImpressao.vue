<script setup>
defineProps(['titulo', 'resumo']);
// O prop 'resumo' espera um objeto assim:
// {
//    tamanhos: { 'Grande': 10, 'Pequena': 5 },
//    trocas: { 'Omelete': 2 },
//    extras: { 'Sem Feijão': 3 }
// }
</script>

<template>
  <div class="resumo-termico">
    <div class="header">
      <h2>RESUMO DE PRODUÇÃO</h2>
      <p class="alvo">{{ titulo }}</p>
      <p class="data">{{ new Date().toLocaleDateString() }} - {{ new Date().toLocaleTimeString().slice(0,5) }}</p>
    </div>

    <hr class="divider">

    <div class="secao">
      <h3>MARMITAS ({{ Object.values(resumo.tamanhos).reduce((a,b)=>a+b,0) }})</h3>
      <ul>
        <li v-for="(qtd, nome) in resumo.tamanhos" :key="nome">
          <span class="qtd">{{ qtd }}x</span> {{ nome }}
        </li>
      </ul>
    </div>

    <div class="secao" v-if="Object.keys(resumo.trocas).length > 0">
      <h3>TROCAS / CARNES</h3>
      <ul>
        <li v-for="(qtd, nome) in resumo.trocas" :key="nome">
          <span class="qtd">{{ qtd }}x</span> {{ nome }}
        </li>
      </ul>
    </div>

    <div class="secao" v-if="Object.keys(resumo.extras).length > 0">
      <h3>ATENÇÃO (MODIFICAÇÕES)</h3>
      <ul>
        <li v-for="(qtd, nome) in resumo.extras" :key="nome">
          <span class="qtd">{{ qtd }}x</span> {{ nome }}
        </li>
      </ul>
    </div>

    <div class="fim">--- Fim do Resumo ---</div>
  </div>
</template>

<style scoped>
.resumo-termico {
  width: 80mm;
  font-family: 'Courier New', monospace;
  padding: 5px;
  background: white;
  color: black;
  margin-bottom: 20px;
  border: 1px solid #ccc; /* Borda só na tela */
}

.header { text-align: center; }
.header h2 { margin: 0; font-size: 16px; border-bottom: 2px solid black; display: inline-block;}
.alvo { font-size: 14px; font-weight: bold; margin: 5px 0; text-transform: uppercase; }
.data { font-size: 10px; }

.divider { border-top: 1px dashed black; margin: 10px 0; }

.secao h3 { font-size: 14px; background: #ddd; margin: 5px 0; padding: 2px; }
ul { list-style: none; padding: 0; margin: 0; }
li { font-size: 14px; margin-bottom: 2px; display: flex; gap: 10px; }
.qtd { font-weight: bold; font-size: 16px; min-width: 30px; text-align: right;}

.fim { text-align: center; font-size: 10px; margin-top: 15px; }

@media print {
  .resumo-termico { border: none; width: 100%; margin: 0; page-break-after: always; }
  .secao h3 { background: none; border-bottom: 1px solid black; font-weight: bold; }
}
</style>