import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useAdminAuthStore = defineStore('adminAuth', () => {
  // Tenta pegar do localStorage ao iniciar (para não deslogar se der F5)
  const token = ref(localStorage.getItem('adminToken') || null);

  function setToken(newToken) {
    token.value = newToken;
    localStorage.setItem('adminToken', newToken);
  }

  function logout() {
    token.value = null;
    localStorage.removeItem('adminToken');
  }

  return { token, setToken, logout };
});