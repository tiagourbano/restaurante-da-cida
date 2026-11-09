import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Ajuste se subir para produção
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000,
});

api.interceptors.request.use(config => {
  const adminToken = localStorage.getItem('adminToken');
  const funcionarioToken = sessionStorage.getItem('funcionarioToken');

  if (adminToken && config.url.includes('/admin')) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  } else if (funcionarioToken) {
    config.headers.Authorization = `Bearer ${funcionarioToken}`;
  } else if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Se deu tudo certo (Status 200, 201...), só repassa a resposta
    return response;
  },
  (error) => {
    // Se deu erro, verificamos se é o famoso 401 (Token Inválido/Expirado)
    if (error.response && error.response.status === 401) {

      // Se for erro em rota de funcionário, limpa a sessão do funcionário
      if (sessionStorage.getItem('funcionarioToken') && !configIsAdminRoute(error.config)) {
        sessionStorage.removeItem('funcionarioToken');
        sessionStorage.removeItem('funcionarioData');
        if (!window.location.pathname.includes('/login')) {
          alert('Sua sessão expirou. Por favor, identifique-se novamente.');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // Se for no painel admin
      if (!window.location.pathname.includes('/admin/login')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        alert('Sua sessão expirou. Por favor, faça login novamente.');
        window.location.href = '/admin/login';
      }
    }

    // Repassa o erro para o componente tratar (caso ele queira mostrar msg especifica)
    return Promise.reject(error);
  }
);

function configIsAdminRoute(config) {
  return config && config.url && config.url.includes('/admin');
}

export default api;
