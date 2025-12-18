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
          component: () => import('../views/AdminView.vue'),
          meta: { roles: ['ADMIN'] },
        },
        {
          path: 'cadastros', // = /admin/cadastros
          name: 'admin-cadastros',
          component: () => import('../views/CadastrosView.vue'),
          meta: { roles: ['ADMIN'] },
        },
        {
          path: 'relatorios', // = /admin/relatorios
          name: 'admin-relatorios',
          component: () => import('../views/RelatoriosView.vue'),
          meta: { roles: ['ADMIN', 'CLIENTE'] },
        }
      ]
    },
  ],
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('adminToken');
  const usuarioRaw = localStorage.getItem('adminUser');
  const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;

  // 1. Verifica se precisa de login
  if (to.matched.some(record => record.meta.requiresAdmin)) {
    if (!token) {
      return next('/admin/login');
    }
  }

  // 2. Verifica Permissões de Perfil (Roles)
  // Olhamos se a rota tem 'roles' definidos
  if (to.meta.roles && usuario) {
    if (!to.meta.roles.includes(usuario.perfil)) {
      // Se o usuário não tem o perfil necessário:
      // Se for CLIENTE tentando acessar coisa de ADMIN, joga pro relatorio
      if (usuario.perfil === 'CLIENTE') {
         return next('/admin/relatorios');
      } else {
         return next('/admin');
      }
    }
  }

  next();
});

export default router
