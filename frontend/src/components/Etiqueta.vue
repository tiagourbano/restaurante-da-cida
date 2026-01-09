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

.cabecalho { display: flex; justify-content: space-between; font-size: 12px; border-bottom: 1px solid black; }
.nome-funcionario { font-size: 18px; font-weight: 900; margin: 5px 0; text-transform: uppercase; line-height: 1.1; }
.tamanho { font-size: 16px; margin-bottom: 5px; }
.extras { color: #000; font-weight: bold; padding: 2px; font-size: 14px; margin-top: 2px; }
.obs { border: 2px solid black; font-weight: bold; padding: 2px; margin-top: 4px; font-size: 12px; }
.rodape { font-size: 10px; text-align: right; margin-top: 5px; font-weight: 700; }

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
    break-after: always;
  }

  .etiqueta-termica:last-child {
    page-break-after: auto;
    break-after: auto;
    margin-bottom: 0;
  }

  .faixa-niver {
    border-radius: 0; /* Quadrado no papel */
    border: 2px solid black; /* Garante contraste */
    -webkit-print-color-adjust: exact; /* Força imprimir o fundo preto */
    print-color-adjust: exact;
  }
}
</style>
