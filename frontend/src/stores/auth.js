import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(sessionStorage.getItem('funcionarioToken') || null);
  const funcionario = ref(JSON.parse(sessionStorage.getItem('funcionarioData') || 'null'));

  function setAuth(dadosFuncionario, novoToken) {
    funcionario.value = dadosFuncionario;
    token.value = novoToken;
    if (novoToken) {
      sessionStorage.setItem('funcionarioToken', novoToken);
    }
    if (dadosFuncionario) {
      sessionStorage.setItem('funcionarioData', JSON.stringify(dadosFuncionario));
    }
  }

  // Mantemos compatibilidade com chamadas existentes
  function setFuncionario(dados) {
    if (dados && dados.token && dados.funcionario) {
      setAuth(dados.funcionario, dados.token);
    } else {
      funcionario.value = dados;
      sessionStorage.setItem('funcionarioData', JSON.stringify(dados));
    }
  }

  function logout() {
    funcionario.value = null;
    token.value = null;
    sessionStorage.removeItem('funcionarioToken');
    sessionStorage.removeItem('funcionarioData');
  }

  return { token, funcionario, setAuth, setFuncionario, logout };
});