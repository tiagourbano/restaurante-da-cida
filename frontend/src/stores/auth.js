import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', () => {
  const funcionario = ref(null);

  function setFuncionario(dados) {
    funcionario.value = dados;
  }

  function logout() {
    funcionario.value = null;
  }

  return { funcionario, setFuncionario, logout };
});