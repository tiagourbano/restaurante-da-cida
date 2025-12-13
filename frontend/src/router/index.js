import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/pedido',
      component: () => import('../views/PedidoView.vue'),
    },
    {
      path: '/admin/login',
      name: 'login-admin',
      component: () => import('../views/LoginAdminView.vue'),
    },
    // GRUPO DE ROTAS PROTEGIDAS COM LAYOUT
    {
      path: '/admin',
      component: () => import('../layouts/AdminLayout.vue'), // O Wrapper Pai
      meta: { requiresAdmin: true },
      children: [
        {
          path: '', // Caminho vazio = /admin (Dashboard/Expedição)
          name: 'admin-dashboard',
          component: () => import('../views/AdminView.vue')
        },
        {
          path: 'cadastros', // = /admin/cadastros
          name: 'admin-cadastros',
          component: () => import('../views/CadastrosView.vue')
        },
        {
          path: 'relatorios', // = /admin/relatorios
          name: 'admin-relatorios',
          component: () => import('../views/RelatoriosView.vue')
        }
      ]
    },
  ],
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('adminToken');

  // Se a rota precisa de admin e não tem token
  if (to.meta.requiresAdmin && !token) {
    next('/admin/login'); // Manda pro login
  } else {
    next(); // Deixa passar
  }
});

export default router
