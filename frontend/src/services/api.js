import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Ajuste se subir para produção
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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

      // Verifica se não estamos já na tela de login para evitar loop infinito
      if (!window.location.pathname.includes('/admin/login')) {

        // 1. Limpa a sujeira do LocalStorage
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');

        // 2. Avisa o usuário (Opcional, pode ser chato se for automático demais)
        alert('Sua sessão expirou. Por favor, faça login novamente.');

        // 3. Redireciona via window.location (Melhor que router.push aqui pois zera a memória do Vue)
        window.location.href = '/admin/login';
      }
    }

    // Repassa o erro para o componente tratar (caso ele queira mostrar msg especifica)
    return Promise.reject(error);
  }
);

export default api;
