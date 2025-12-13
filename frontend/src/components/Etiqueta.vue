<script setup>
defineProps(['pedido']);
</script>

<template>
  <div class="etiqueta-termica">
    <div class="cabecalho">
      <span class="empresa">{{ pedido.empresaNome }}</span>
      <span class="setor">{{ pedido.setorNome }}</span>
    </div>

    <div class="nome-funcionario">
      {{ pedido.funcionarioNome }}
    </div>

    <div class="tamanho">
      TAMANHO: <strong>{{ pedido.tamanhoNome }}</strong>
    </div>

    <div class="extras" v-if="pedido.opcoesEscolhidasString">
      ⚠️ {{ pedido.opcoesEscolhidasString }}
    </div>

    <div class="obs" v-if="pedido.observacao">
      OBS: {{ pedido.observacao }}
    </div>

    <div class="rodape">
      {{ new Date().toLocaleDateString() }}
    </div>
  </div>
</template>

<style scoped>
.etiqueta-termica {
  width: 80mm; /* Largura da bobina */
  min-height: 40mm; /* Altura minima */
  border: 1px solid #ccc; /* Borda cinza na tela */
  background: white;
  padding: 5px;
  margin-bottom: 5px;
  font-family: sans-serif;
  color: black;
  page-break-inside: avoid; /* Tenta não quebrar a etiqueta no meio */
}

.cabecalho { display: flex; justify-content: space-between; font-size: 12px; border-bottom: 1px solid black; }
.nome-funcionario { font-size: 18px; font-weight: 900; margin: 5px 0; text-transform: uppercase; line-height: 1.1; }
.tamanho { font-size: 16px; margin-bottom: 5px; }
.extras { background: #000; color: #fff; font-weight: bold; padding: 2px; font-size: 14px; margin-top: 2px; }
.obs { border: 2px solid black; font-weight: bold; padding: 2px; margin-top: 4px; font-size: 12px; }
.rodape { font-size: 10px; text-align: right; margin-top: 5px; }

/* CSS ESPECÍFICO PARA A IMPRESSORA */
@media print {
  /* Esconde tudo que tem a classe .no-print (botões, menus, resumos) */
  .no-print { display: none !important; }

  body, html { margin: 0; padding: 0; }

  .etiqueta-termica {
    border: none; /* Remove a borda na impressão */
    border-bottom: 1px dashed #000; /* Linha de corte */
    width: 100%; /* Ocupa 100% da bobina */
    margin: 0;
    padding: 10px 0;
    page-break-after: always; /* Força cortar página/pular para proxima etiqueta */
  }
}
</style>