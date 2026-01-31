// API Configuration
// Usa variables de entorno desde config.env.js
const API_CONFIG = {
    // Base URL - se obtiene desde ENV_CONFIG
    get BASE_URL() {
        if (typeof ENV_CONFIG === 'undefined') {
            console.error('ENV_CONFIG no está definido. Asegúrate de cargar config.env.js antes de config.js');
            return 'http://localhost:3000/api'; // Fallback
        }
        return ENV_CONFIG.current.API_BASE_URL;
    },

    // Endpoints
    ENDPOINTS: {
        GENERATE_TOKEN: '/generar-token',
        PENDING_USERS: '/usuarios-pendientes',
        USERS: '/users',
        BULK_INVITATIONS: '/invitaciones/bulk/evento-ef'
    },

    // Helper para construir URLs completas
    getUrl(endpoint) {
        return `${this.BASE_URL}${endpoint}`;
    },

    // Helper para construir URLs con parámetros
    getUserUrl(idUuid, action = '') {
        const path = action ? `${this.ENDPOINTS.USERS}/${idUuid}/${action}` : `${this.ENDPOINTS.USERS}/${idUuid}`;
        console.log('esta es la url', path);
        return `${this.BASE_URL}${path}`;
    }
};
