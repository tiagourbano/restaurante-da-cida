<script setup>
import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';
import { useAdminAuthStore } from '../stores/adminAuth';

const router = useRouter();
const route = useRoute(); // Para saber qual aba está ativa
const adminStore = useAdminAuthStore();

const isAdmin = computed(() => {
  return adminStore.usuario && adminStore.usuario.perfil === 'ADMIN';
});

const sair = () => {
  adminStore.logout();
  router.push('/admin/login');
};

const irPara = (caminho) => {
  router.push(caminho);
};
</script>

<template>
  <div class="admin-layout">
    <nav class="navbar no-print">
      <div class="logo">
        🍽️ Sistema Marmitas <span class="badge">Admin</span>
      </div>

      <div class="menu">
        <button
          v-if="isAdmin"
          :class="{ ativo: route.path === '/admin' }"
          @click="irPara('/admin')"
        >
          📦 Expedição
        </button>

        <button
          v-if="isAdmin"
          :class="{ ativo: route.path === '/admin/cadastros' }"
          @click="irPara('/admin/cadastros')"
        >
          ⚙️ Configurações
        </button>

        <button
          :class="{ ativo: route.path === '/admin/relatorios' }"
          @click="irPara('/admin/relatorios')"
        >
          📊 Relatórios
        </button>
      </div>

      <div class="logout">
        <button @click="sair" class="btn-sair">Sair 🚪</button>
      </div>
    </nav>

    <main class="conteudo">
      <router-view />
    </main>

    <footer class="no-print">
      Sistema desenvolvido com ❤️ para a Cida.
    </footer>
  </div>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f4f6f8; /* Fundo cinza bem clarinho pro sistema todo */
}

.navbar {
  background-color: #2c3e50;
  color: white;
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.logo { font-weight: bold; font-size: 1.2rem; display: flex; align-items: center; gap: 10px; }
.badge { background: #e74c3c; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; text-transform: uppercase; }

.menu { display: flex; gap: 5px; height: 100%; }

.menu button {
  background: transparent;
  border: none;
  color: #bdc3c7;
  height: 100%;
  padding: 0 20px;
  cursor: pointer;
  font-size: 1rem;
  transition: 0.2s;
  border-bottom: 3px solid transparent;
}

.menu button:hover { color: white; background: rgba(255,255,255,0.05); }

.menu button.ativo {
  color: white;
  border-bottom: 3px solid #42b983; /* Cor de destaque */
  background: rgba(255,255,255,0.1);
}

.btn-sair {
  background: none; border: 1px solid #e74c3c; color: #e74c3c; padding: 5px 15px; border-radius: 20px; cursor: pointer; font-weight: bold; transition: 0.2s;
}
.btn-sair:hover { background: #e74c3c; color: white; }

.conteudo {
  flex: 1; /* Ocupa o resto da tela */
  padding: 20px;
  overflow-y: auto;
}

footer {
  text-align: center; padding: 10px; font-size: 0.8rem; color: #999;
}

@media print {
  .no-print { display: none !important; }
  .admin-layout { background: white; }
  .conteudo { padding: 0; }
}

/* Responsivo para celular */
@media (max-width: 600px) {
  .navbar { flex-direction: column; height: auto; padding: 10px; gap: 10px; }
  .menu { width: 100%; justify-content: space-around; }
  .menu button { padding: 10px; font-size: 0.9rem; }
}
</style>