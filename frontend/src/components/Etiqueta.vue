<script setup>
defineProps(['pedido']);
</script>

<template>
  <div class="etiqueta-termica">
    <div v-if="pedido.isAniversariante" class="faixa-niver">
      🎉 FELIZ ANIVERSÁRIO! 🎂
    </div>

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
      <!-- ⚠️ -->
      - <span v-html="pedido.opcoesEscolhidasString.split(' + ').reverse().join('<br />- ')"></span>
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

/* ESTILO DA FAIXA DE ANIVERSÁRIO */
.faixa-niver {
  background: black;
  color: white;
  text-align: center;
  font-weight: 900;
  font-size: 16px;
  padding: 5px;
  margin-bottom: 5px;
  border-radius: 4px; /* Arredondado na tela */
  text-transform: uppercase;
}

.cabecalho { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; border-bottom: 1px solid black; }
.nome-funcionario { font-size: 18px; font-weight: 900; margin: 5px 0; text-transform: uppercase; line-height: 1.1; }
.tamanho { font-size: 18px; margin-bottom: 5px; }
.extras { color: #000; font-weight: bold; padding: 2px; font-size: 14px; margin-top: 2px; }
.obs { border: 2px solid black; font-weight: bold; padding: 2px; margin-top: 4px; font-size: 12px; }
.rodape { font-size: 10px; text-align: right; margin-top: 5px; font-weight: 700; }

/* CSS ESPECÍFICO PARA A IMPRESSORA */
@media print {
  .no-print { display: none !important; }
  body, html { margin: 0; padding: 0; }

  .etiqueta-termica {
    border: none;
    /* Removemos a borda de corte dashed para economizar altura,
       ou use border-bottom: none se a impressora já corta */
    border-bottom: 1px dashed #000;

    width: 100%;
    margin: 0;

    /* IMPORTANTE: Reduzi o padding. 10px era muito.
       Use pouco ou nenhum padding vertical na impressão */
    padding: 2mm 0;

    page-break-after: always;
    break-after: always;

    /* Garante que não estoure a altura se passar um pouco */
    overflow: hidden;
  }

  /* O SEGREDO DO LAST-CHILD */
  .etiqueta-termica:last-child {
    page-break-after: auto;
    break-after: auto;
    margin-bottom: 0;
    border-bottom: none; /* Remove a linha da última também */
  }

  .faixa-niver {
    border-radius: 0;
    border: 2px solid black;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
