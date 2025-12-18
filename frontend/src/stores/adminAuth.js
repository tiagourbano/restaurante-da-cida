import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useAdminAuthStore = defineStore('adminAuth', () => {
  const token = ref(localStorage.getItem('adminToken') || null);
  // Guardamos o usuário também para saber se mostramos o menu completo ou restrito
  const usuario = ref(JSON.parse(localStorage.getItem('adminUser') || 'null'));

  function setToken(newToken) {
    token.value = newToken;
    localStorage.setItem('adminToken', newToken);
  }

  function setUsuario(newUser) {
    usuario.value = newUser;
    localStorage.setItem('adminUser', JSON.stringify(newUser));
  }

  function logout() {
    token.value = null;
    usuario.value = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  }

  return { token, usuario, setToken, setUsuario, logout };
});