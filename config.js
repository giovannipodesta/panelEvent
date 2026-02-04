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

    // Autenticación para endpoints protegidos
    get AUTH_HEADER() {
        return 'Basic ' + btoa('gpodesta:3ncuentr4e.C25');
    },

    // Headers comunes para peticiones autenticadas
    get authHeaders() {
        return {
            'Authorization': this.AUTH_HEADER,
            'Content-Type': 'application/json'
        };
    },

    // Endpoints
    ENDPOINTS: {
        GENERATE_TOKEN: '/generar-token',
        PENDING_USERS: '/usuarios-pendientes',
        USERS: '/users',
        BULK_INVITATIONS: '/invitaciones/bulk',
        STATS_TOKENS: '/stats/tokens',
        // Nuevos endpoints para invitados especiales y referidos
        LISTAR_INVITADOS_ESPECIALES: '/panel/listar-invitados-especiales',
        LISTAR_REFERIDOS: '/panel/invitados-especiales',
        APROBAR_REFERIDO: '/panel/aprobar-referido',
        RECHAZAR_REFERIDO: '/panel/rechazar-referido',
        ACTUALIZAR_MAX_REFERIDOS: '/panel/actualizar-max-referidos',
        // Evolution endpoints
        EVOLUTION_STATS: '/evolution-stats/stats',
        EVOLUTION_SEND_QR: '/evento/send-qr'
    },

    // Helper para obtener el EVENT_ID actual
    get eventId() {
        if (typeof ENV_CONFIG === 'undefined') {
            console.error('ENV_CONFIG no está definido');
            return 'evento-prod'; // Fallback
        }
        return ENV_CONFIG.current.EVENT_ID || 'evento-prod';
    },

    // Helper para construir URLs completas
    getUrl(endpoint) {
        return `${this.BASE_URL}${endpoint}`;
    },

    // Helper para construir URLs con evento
    getEventUrl(endpoint) {
        return `${this.BASE_URL}${endpoint}/${this.eventId}`;
    },

    // Helper para construir URLs de bulk invitations
    getBulkInvitationsUrl() {
        return `${this.BASE_URL}${this.ENDPOINTS.BULK_INVITATIONS}/${this.eventId}`;
    },

    // Helper para construir URLs de evolution stats
    getEvolutionStatsUrl() {
        return `${this.BASE_URL}${this.ENDPOINTS.EVOLUTION_STATS}/${this.eventId}`;
    },

    // Helper para construir URLs de send QR
    getSendQRUrl() {
        return `${this.BASE_URL}${this.ENDPOINTS.EVOLUTION_SEND_QR}/${this.eventId}`;
    },

    // Helper para construir URLs con parámetros
    getUserUrl(idUuid, action = '') {
        const path = action ? `${this.ENDPOINTS.USERS}/${idUuid}/${action}` : `${this.ENDPOINTS.USERS}/${idUuid}`;
        console.log('esta es la url', path);
        return `${this.BASE_URL}${path}`;
    }
};
