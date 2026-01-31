// Environment Configuration
// IMPORTANTE: No subir este archivo a Git si contiene datos sensibles
// Copia este archivo como config.env.local.js para desarrollo local

const ENV_CONFIG = {
    // Entorno actual: 'development' | 'production'
    ENVIRONMENT: 'development',
    
    // Configuración por entorno
    development: {
        API_BASE_URL: 'http://100.67.71.55:3000/api',
        // Agregar otras variables de desarrollo aquí
    },
    
    production: {
        API_BASE_URL: 'https://evento.encuentra-facil.com/api',
        // Agregar otras variables de producción aquí
    },
    
    // Helper para obtener la configuración actual
    get current() {
        return this[this.ENVIRONMENT];
    }
};

// Exportar para uso en otros archivos
window.ENV_CONFIG = ENV_CONFIG;
