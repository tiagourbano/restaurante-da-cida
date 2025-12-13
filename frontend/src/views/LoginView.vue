<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

const ra = ref('');
const erro = ref('');
const loading = ref(false);
const router = useRouter();
const authStore = useAuthStore();

const login = async () => {
  if (!ra.value) return;
  loading.value = true;
  erro.value = '';

  try {
    // Enviando como camelCase (mas o axios converte pra JSON automaticamente)
    const response = await api.post('/login', { raCpf: ra.value });

    // Salva na store e vai para pedido
    authStore.setFuncionario(response.data);
    router.push('/pedido');
  } catch (e) {
    erro.value = e.response?.data?.message || 'Erro ao entrar. Verifique o RA.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <h1>Bem-vindo!</h1>
    <p>Digite seu RA ou CPF para pedir sua marmita.</p>

    <div class="form">
      <input
        v-model="ra"
        type="tel"
        placeholder="Apenas números"
        class="input-zao"
        @keyup.enter="login"
      />

      <button @click="login" :disabled="loading" class="btn-zao">
        {{ loading ? 'Buscando...' : 'ACESSAR CARDÁPIO' }}
      </button>

      <p v-if="erro" class="erro">{{ erro }}</p>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
  text-align: center;
}
.input-zao {
  width: 100%;
  padding: 20px;
  font-size: 24px;
  margin-bottom: 20px;
  border-radius: 10px;
  border: 1px solid #ccc;
  text-align: center;
}
.btn-zao {
  width: 100%;
  padding: 20px;
  background-color: #42b983; /* Cor do Vue, use a marca da sua tia */
  color: white;
  font-size: 20px;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}
.erro {
  color: red;
  margin-top: 15px;
  font-weight: bold;
}
</style>