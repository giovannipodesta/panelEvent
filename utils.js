// ==========================================
// UTILIDADES COMPARTIDAS
// ==========================================

/**
 * Formatea un número de teléfono para mostrarlo de forma legible
 * @param {string} phone - Número de teléfono (10 dígitos)
 * @returns {string} Teléfono formateado (ej: 099-123-4567)
 */
function formatPhone(phone) {
    if (!phone) return '-';
    // Limpiar el número
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 10) {
        return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    }
    return phone;
}

/**
 * Formatea una fecha ISO a formato legible en español (Ecuador)
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Formatea una fecha con formato completo
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
function formatDateFull(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-EC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Muestra una notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success' | 'error' | 'warning'
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.log(`Toast (${type}):`, message);
        return;
    }

    toast.textContent = message;

    // Colores según tipo
    const colors = {
        success: { bg: 'rgba(255, 255, 255, 0.95)', color: '#000' },
        error: { bg: 'rgba(239, 68, 68, 0.95)', color: '#fff' },
        warning: { bg: 'rgba(255, 198, 0, 0.95)', color: '#000' }
    };

    const style = colors[type] || colors.success;
    toast.style.background = style.bg;
    toast.style.color = style.color;

    toast.classList.remove('hidden');

    // Auto-hide después de 3 segundos
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

/**
 * Crea una función debounced que retrasa la ejecución
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Milisegundos de espera
 * @returns {Function} Función debounced
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Obtiene las iniciales de un nombre o los últimos dígitos de un teléfono
 * @param {string} value - Nombre o teléfono
 * @returns {string} Iniciales o últimos 2 dígitos
 */
function getInitials(value) {
    if (!value) return '?';

    // Si parece ser un teléfono (solo números)
    if (/^\d+$/.test(value.replace(/\D/g, ''))) {
        return value.slice(-2);
    }

    // Si es un nombre
    return value.split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

/**
 * Crea un elemento de skeleton loader
 * @param {number} count - Número de skeletons a crear
 * @param {string} className - Clase CSS para el skeleton
 * @returns {string} HTML de los skeletons
 */
function createSkeletons(count = 3, className = 'skeleton-card') {
    return Array(count).fill(`<div class="${className}"></div>`).join('');
}

/**
 * Crea un badge de estado con colores
 * @param {string} estado - Estado a mostrar
 * @param {object} customColors - Colores personalizados { bg, color, border }
 * @returns {string} HTML del badge
 */
function createStatusBadge(estado, customColors = null) {
    const defaultColors = {
        // Estados de token
        'habilitado': { bg: 'rgba(255, 198, 0, 0.15)', color: 'var(--accent-yellow)', border: 'rgba(255, 198, 0, 0.3)' },
        'consumido': { bg: 'rgba(20, 184, 166, 0.15)', color: 'var(--accent-turquoise)', border: 'rgba(20, 184, 166, 0.3)' },
        // Estados de aceptación
        'ACEPTADO': { bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: 'rgba(16, 185, 129, 0.3)' },
        'aceptado': { bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: 'rgba(16, 185, 129, 0.3)' },
        'RECHAZADO': { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: 'rgba(239, 68, 68, 0.3)' },
        'rechazado': { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: 'rgba(239, 68, 68, 0.3)' },
        'pendiente': { bg: 'rgba(136, 146, 176, 0.15)', color: 'var(--text-muted)', border: 'rgba(136, 146, 176, 0.3)' },
        // Estados de envío
        'enviado': { bg: 'rgba(16, 185, 129, 0.15)', color: '#155724', border: 'rgba(16, 185, 129, 0.3)' },
        'error': { bg: 'rgba(239, 68, 68, 0.15)', color: '#721c24', border: 'rgba(239, 68, 68, 0.3)' },
        'procesando': { bg: 'rgba(20, 184, 166, 0.15)', color: '#0c5460', border: 'rgba(20, 184, 166, 0.3)' }
    };

    const colors = customColors || defaultColors[estado] || defaultColors['pendiente'];

    return `<span style="
        display: inline-block;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        background: ${colors.bg};
        color: ${colors.color};
        border: 1px solid ${colors.border};
    ">${estado || 'N/A'}</span>`;
}

/**
 * Valida un número de teléfono ecuatoriano
 * @param {string} phone - Número de teléfono
 * @returns {boolean} true si es válido
 */
function isValidEcuadorPhone(phone) {
    if (!phone) return false;
    const clean = phone.replace(/\D/g, '');
    return /^\d{10}$/.test(clean);
}

/**
 * Limpia y normaliza un número de teléfono
 * @param {string} phone - Número de teléfono
 * @returns {string} Número limpio de 10 dígitos o null
 */
function cleanPhoneNumber(phone) {
    if (!phone) return null;

    let clean = phone.replace(/[\s\-\(\)]/g, '');

    // Remover código de país +593 o 593
    if (clean.startsWith('+593')) {
        clean = '0' + clean.slice(4);
    } else if (clean.startsWith('593')) {
        clean = '0' + clean.slice(3);
    }

    // Agregar 0 si falta
    if (!clean.startsWith('0') && clean.length === 9) {
        clean = '0' + clean;
    }

    return clean.length === 10 ? clean : null;
}

// Exportar funciones para uso global
window.SharedUtils = {
    formatPhone,
    formatDate,
    formatDateFull,
    showToast,
    debounce,
    getInitials,
    createSkeletons,
    createStatusBadge,
    isValidEcuadorPhone,
    cleanPhoneNumber
};
