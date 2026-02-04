/**
 * Expandable Cards Component
 * Componente para tarjetas expandibles con actualización automática
 */

class ExpandableCardsManager {
    constructor() {
        this.updateIntervals = {};
        this.autoRefreshInterval = null;
    }

    /**
     * Inicializa una tarjeta expandible
     * @param {string} cardId - ID del contenedor
     */
    init(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;

        const header = card.querySelector('.expandable-card-header');
        if (header) {
            header.addEventListener('click', (e) => {
                // Evitar toggle si se hace click en el botón de refresh
                if (e.target.closest('.refresh-btn-mini')) return;
                this.toggle(cardId);
            });
        }
    }

    /**
     * Toggle expandir/colapsar
     */
    toggle(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;

        const content = card.querySelector('.expandable-card-content');
        const isExpanded = card.classList.toggle('expanded');

        if (isExpanded && content) {
            // Calcular altura real del contenido
            const body = content.querySelector('.expandable-card-body');
            if (body) {
                content.style.maxHeight = body.scrollHeight + 'px';
            }
        } else if (content) {
            content.style.maxHeight = '0';
        }
    }

    /**
     * Expande la tarjeta
     */
    expand(cardId) {
        const card = document.getElementById(cardId);
        if (card && !card.classList.contains('expanded')) {
            this.toggle(cardId);
        }
    }

    /**
     * Colapsa la tarjeta
     */
    collapse(cardId) {
        const card = document.getElementById(cardId);
        if (card && card.classList.contains('expanded')) {
            this.toggle(cardId);
        }
    }

    /**
     * Actualiza el contador en el badge de la tarjeta
     */
    updateBadge(cardId, count, type = '') {
        const card = document.getElementById(cardId);
        if (!card) return;

        const badge = card.querySelector('.card-count-badge');
        if (badge) {
            badge.textContent = count;
            badge.className = 'card-count-badge' + (type ? ' ' + type : (count === 0 ? ' empty' : ''));
        }
    }

    /**
     * Inicia la actualización automática de contadores
     */
    startCountdownUpdates() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }

        this.autoRefreshInterval = setInterval(() => {
            document.querySelectorAll('.countdown-timer[data-ts]').forEach(el => {
                const ts = Number(el.dataset.ts);
                const diff = ts - Date.now();

                if (diff <= 0) {
                    el.textContent = 'Enviando...';
                    el.classList.add('sending');

                    // Marcar para refresh automático
                    const cardId = el.closest('.expandable-card')?.id;
                    if (cardId && !el.dataset.refreshScheduled) {
                        el.dataset.refreshScheduled = 'true';
                        // Programar refresh después de unos segundos
                        setTimeout(() => {
                            this.triggerRefresh(cardId);
                        }, 5000);
                    }
                    return;
                }

                el.classList.remove('sending');
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                el.textContent = h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
            });
        }, 1000);
    }

    /**
     * Dispara el refresh de una tarjeta
     */
    triggerRefresh(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;

        const refreshBtn = card.querySelector('.refresh-btn-mini');
        if (refreshBtn) {
            refreshBtn.click();
        }
    }

    /**
     * Renderiza la lista de mensajes programados
     */
    renderProgramados(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!data || data.total === 0) {
            container.innerHTML = this.getEmptyStateHTML('📅', 'No hay mensajes programados pendientes');
            this.updateBadge('programadosCard', 0, 'empty');
            return;
        }

        this.updateBadge('programadosCard', data.total, 'warning');

        container.innerHTML = `
            <div class="auto-refresh-indicator">
                <span class="dot"></span>
                <span>Actualización automática activa</span>
            </div>
            <div class="messages-list">
                ${data.envios.map(e => `
                    <div class="message-item">
                        <div class="message-item-left">
                            <span class="message-phone">${this.formatPhone(e.telefono)}</span>
                            <span class="message-time">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                ${e.horaEcuador}
                            </span>
                        </div>
                        <div class="message-item-right">
                            <span class="countdown-timer" data-ts="${e.timestampEnvio}">${e.tiempoRestante.texto}</span>
                            <span class="status-badge-mini ${e.estado.toLowerCase()}">${e.estado}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Actualizar altura si está expandido
        this.refreshCardHeight('programadosCard');
    }

    /**
     * Renderiza el historial de envíos
     */
    renderHistorial(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!data || data.total === 0) {
            container.innerHTML = this.getEmptyStateHTML('📜', 'No hay historial de envíos');
            this.updateBadge('historialCard', 0, 'empty');
            return;
        }

        this.updateBadge('historialCard', data.total, 'success');

        // Stats summary
        const statsHTML = data.stats ? `
            <div class="card-stats-summary">
                <div class="card-stat-item">
                    <span class="label">Pendientes:</span>
                    <span class="value warning">${data.stats.pendientes || 0}</span>
                </div>
                <div class="card-stat-item">
                    <span class="label">Enviados:</span>
                    <span class="value success">${data.stats.enviados || 0}</span>
                </div>
                <div class="card-stat-item">
                    <span class="label">Errores:</span>
                    <span class="value error">${data.stats.errores || 0}</span>
                </div>
            </div>
        ` : '';

        container.innerHTML = `
            ${statsHTML}
            <div class="messages-list">
                ${data.envios.slice(0, 15).map(e => `
                    <div class="message-item">
                        <div class="message-item-left">
                            <span class="message-phone">${this.formatPhone(e.telefono)}</span>
                            <span class="message-time">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                ${e.horaEcuador}
                            </span>
                        </div>
                        <div class="message-item-right">
                            ${e.enviadoAt ? `<span class="message-time">${this.formatDateTime(e.enviadoAt)}</span>` : ''}
                            <span class="status-badge-mini ${e.estado.toLowerCase()}">${e.estado}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${data.total > 15 ? `
                <p style="text-align: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
                    Mostrando 15 de ${data.total} mensajes
                </p>
            ` : ''}
        `;

        // Actualizar altura si está expandido
        this.refreshCardHeight('historialCard');
    }

    /**
     * Actualiza la altura del contenido expandible
     */
    refreshCardHeight(cardId) {
        const card = document.getElementById(cardId);
        if (!card || !card.classList.contains('expanded')) return;

        const content = card.querySelector('.expandable-card-content');
        const body = content?.querySelector('.expandable-card-body');
        if (content && body) {
            content.style.maxHeight = body.scrollHeight + 'px';
        }
    }

    /**
     * Estado vacío HTML
     */
    getEmptyStateHTML(icon, message) {
        return `
            <div class="card-empty-state">
                <div class="icon">${icon}</div>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Formatea teléfono
     */
    formatPhone(phone) {
        if (!phone) return '-';
        if (phone.length === 10) {
            return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
        }
        return phone;
    }

    /**
     * Formatea fecha y hora
     */
    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('es-EC', {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Destruye los intervalos
     */
    destroy() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        Object.values(this.updateIntervals).forEach(id => clearInterval(id));
    }
}

// Exportar instancia global
window.ExpandableCards = new ExpandableCardsManager();
