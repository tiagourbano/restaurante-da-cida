<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { useAdminAuthStore } from '../stores/adminAuth';

const senha = ref('');
const erro = ref('');
const router = useRouter();
const adminStore = useAdminAuthStore();

const entrar = async () => {
  try {
    const res = await api.post('/admin/login', { password: senha.value });
    adminStore.setToken(res.data.token);
    router.push('/admin'); // Manda para o dashboard
  } catch (e) {
    erro.value = 'Senha incorreta!';
  }
};
</script>

<template>
  <div class="login-admin">
    <h2>Área Restrita</h2>
    <input type="password" v-model="senha" placeholder="Senha Mestra" @keyup.enter="entrar">
    <button @click="entrar">Entrar</button>
    <p v-if="erro" class="erro">{{ erro }}</p>
    <router-link to="/" class="voltar">Voltar para Pedidos</router-link>
  </div>
</template>

<style scoped>
.login-admin { display: flex; flex-direction: column; align-items: center; padding-top: 100px; gap: 15px; }
input { padding: 10px; font-size: 18px; }
button { padding: 10px 20px; font-size: 18px; background: #2c3e50; color: white; border: none; cursor: pointer; }
.erro { color: red; font-weight: bold; }
.voltar { margin-top: 20px; color: #666; }
</style>