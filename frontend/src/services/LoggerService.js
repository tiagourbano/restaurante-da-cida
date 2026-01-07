import api from './api'; // Sua instância do Axios

const LoggerService = {
  log(level, message, stack = null, info = null) {
    // Evita loop infinito se a própria API de log falhar
    try {
      const payload = {
        level,
        message,
        stack,
        info,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Usa sendBeacon se disponível (melhor para quando a aba fecha)
      // Ou axios fallback
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const url = `${import.meta.env.VITE_API_URL}/logs-frontend`; // Ajuste sua URL base

      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, blob);
      } else {
        // Fallback simples
        api.post('/logs-frontend', payload).catch(e => console.error("Falha ao enviar log", e));
      }
    } catch (e) {
      console.error("Erro crítico no LoggerService", e);
    }
  },

  error(message, stack, info) {
    this.log('error', message, stack, info);
  },

  info(message) {
    this.log('info', message);
  }
};

export default LoggerService;
