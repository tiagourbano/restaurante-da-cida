<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { useAdminAuthStore } from '../stores/adminAuth';

const form = ref({ login: '', password: '' });
const erro = ref('');
const router = useRouter();
const adminStore = useAdminAuthStore();

const entrar = async () => {
  try {
    const res = await api.post('/admin/login', form.value);

    // Salva token e dados do usuário
    adminStore.setToken(res.data.token);
    adminStore.setUsuario(res.data.usuario); // Atualize sua store para aceitar isso

    if (res.data.usuario.perfil === 'CLIENTE') {
      router.push('/admin/relatorios');
    } else {
      router.push('/admin'); // Admin vai pra home/expedição
    }
  } catch (e) {
    erro.value = 'Login inválido.' + e;
  }
};
</script>

<template>
  <div class="login-admin">
    <h2>Acesso ao Sistema</h2>

    <div class="card-login">
        <input v-model="form.login" placeholder="Usuário (Login)" autofocus>
        <input type="password" v-model="form.password" placeholder="Senha" @keyup.enter="entrar">

        <button @click="entrar">Entrar</button>
    </div>

    <p v-if="erro" class="erro">{{ erro }}</p>
    <router-link to="/" class="voltar">Voltar para Pedidos</router-link>
  </div>
</template>

<style scoped>
.login-admin { display: flex; flex-direction: column; align-items: center; padding-top: 80px; gap: 15px; background: #f4f6f8; min-height: 100vh; }
.card-login { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: flex; flex-direction: column; gap: 10px; width: 300px; }
input { padding: 12px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; }
button { padding: 12px; font-size: 16px; background: #2c3e50; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold;}
button:hover { background: #34495e; }
.erro { color: red; font-weight: bold; }
.voltar { margin-top: 20px; color: #666; font-size: 0.9em; }
</style>