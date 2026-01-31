// API Configuration
const API_CONFIG = {
    // Base URL - cambiar aquí para actualizar todas las peticiones
    // BASE_URL: 'https://evento.encuentra-facil.com/api',
    BASE_URL: 'http://localhost:3000/api',

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
