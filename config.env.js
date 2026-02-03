// Environment Configuration
// IMPORTANTE: No subir este archivo a Git si contiene datos sensibles
// Copia este archivo como config.env.local.js para desarrollo local

const ENV_CONFIG = {
    // Entorno actual: 'development' | 'production'
    ENVIRONMENT: 'development',

    // Configuración por entorno
    development: {
        API_BASE_URL: 'http://localhost:3000/api',
        BASE_PATH: '/panel/',
        // Agregar otras variables de desarrollo aquí
    },

    production: {
        API_BASE_URL: 'https://evento.encuentra-facil.com/api',
        BASE_PATH: '/',
        // Agregar otras variables de producción aquí
    },

    // Helper para obtener la configuración actual
    get current() {
        return this[this.ENVIRONMENT];
    },

    // Helper para obtener el base path correcto automáticamente
    get basePath() {
        // Auto-detectar basado en el hostname
        const hostname = window.location.hostname;

        // Si es localhost o 127.0.0.1, estamos en desarrollo local
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
            return '/';
        }

        // En producción (evento.encuentra-facil.com o cualquier otro dominio)
        return '/panel/';
    },

    // Helper para construir rutas de assets
    getAssetPath(relativePath) {
        // Eliminar slash inicial si existe
        const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
        return this.basePath + cleanPath;
    }
};

// Exportar para uso en otros archivos
window.ENV_CONFIG = ENV_CONFIG;
