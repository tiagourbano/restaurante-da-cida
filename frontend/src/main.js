import { createApp } from 'vue'
import { createPinia } from 'pinia'

import LoggerService from './services/LoggerService';
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.config.devtools = false;

// 1. Erros do VUE (Template, Lifecycle hooks, etc)
app.config.errorHandler = (err, instance, info) => {
  console.error("Vue Error Capturado:", err); // Mantém no console do browser pra debug local

  LoggerService.error(
    err.message || 'Erro desconhecido no Vue',
    err.stack,
    info // Informação de qual componente quebrou
  );
};

// 2. Erros de Promises não tratadas (Axios falhando sem catch, etc)
window.addEventListener('unhandledrejection', (event) => {
  LoggerService.error(
    `Unhandled Promise: ${event.reason}`,
    event.reason ? event.reason.stack : null,
    'Window Unhandled Rejection'
  );
});

app.use(createPinia())
app.use(router)

app.mount('#app')
