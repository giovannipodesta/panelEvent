// ==========================================
// GESTIÓN DE REFERIDOS - APROBACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const referidosGrid = document.getElementById('referidosGrid');
    const searchInput = document.getElementById('searchInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const statusTabs = document.getElementById('statusTabs');
    const confirmModal = document.getElementById('confirmModal');
    const toast = document.getElementById('toast');

    // Stats elements
    const statTotal = document.getElementById('statTotal');
    const statPendientes = document.getElementById('statPendientes');
    const statConfirmados = document.getElementById('statConfirmados');
    const statRechazados = document.getElementById('statRechazados');

    // Count elements
    const countPendientes = document.getElementById('countPendientes');
    const countTodos = document.getElementById('countTodos');
    const countAceptados = document.getElementById('countAceptados');
    const countRechazados = document.getElementById('countRechazados');

    // State
    let allReferidos = [];
    let filteredReferidos = [];
    let currentFilter = 'pendientes';
    let pendingAction = null;

    // API URLs
    const LISTAR_URL = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.LISTAR_REFERIDOS);
    const APROBAR_URL = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.APROBAR_REFERIDO);
    const RECHAZAR_URL = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.RECHAZAR_REFERIDO);

    // Event Listeners
    refreshBtn.addEventListener('click', loadReferidos);
    searchInput.addEventListener('input', debounce(filterReferidos, 300));

    statusTabs.querySelectorAll('.status-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            statusTabs.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.status;
            filterReferidos();
        });
    });

    // Initial load
    loadReferidos();

    // ==========================================
    // API CALLS
    // ==========================================

    async function loadReferidos() {
        showLoadingState();

        try {
            const response = await fetch(LISTAR_URL, {
                headers: API_CONFIG.authHeaders
            });

            if (!response.ok) throw new Error('Error al cargar referidos');

            const data = await response.json();
            allReferidos = data.invitados || [];

            updateStats(data);
            updateCounts();
            filterReferidos();

        } catch (error) {
            console.error('Error:', error);
            showToast('Error al cargar los referidos', 'error');
            showEmptyState('Error al cargar los datos.');
        }
    }

    async function aprobarReferido(tokenId) {
        try {
            const response = await fetch(APROBAR_URL, {
                method: 'POST',
                headers: API_CONFIG.authHeaders,
                body: JSON.stringify({ tokenId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error al aprobar');
            }

            // Actualizar localmente
            const referido = allReferidos.find(r => r.id === tokenId);
            if (referido) {
                referido.aceptacion = 'ACEPTADO';
                referido.estado = 'consumido';
            }

            showToast('✅ Referido aprobado y QR enviado');
            updateCounts();
            filterReferidos();
            return true;

        } catch (error) {
            console.error('Error:', error);
            showToast(error.message || 'Error al aprobar el referido', 'error');
            return false;
        }
    }

    async function rechazarReferido(tokenId) {
        try {
            const response = await fetch(RECHAZAR_URL, {
                method: 'POST',
                headers: API_CONFIG.authHeaders,
                body: JSON.stringify({ tokenId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error al rechazar');
            }

            // Actualizar localmente
            const referido = allReferidos.find(r => r.id === tokenId);
            if (referido) {
                referido.aceptacion = 'RECHAZADO';
                referido.estado = 'consumido';
            }

            showToast('Referido rechazado');
            updateCounts();
            filterReferidos();
            return true;

        } catch (error) {
            console.error('Error:', error);
            showToast(error.message || 'Error al rechazar', 'error');
            return false;
        }
    }

    // ==========================================
    // UI RENDERING
    // ==========================================

    function updateStats(data) {
        statTotal.textContent = data.total || allReferidos.length;
        statPendientes.textContent = data.pendientes || 0;
        statConfirmados.textContent = data.confirmados || 0;

        const rechazados = allReferidos.filter(r => r.aceptacion === 'RECHAZADO').length;
        statRechazados.textContent = rechazados;
    }

    function updateCounts() {
        const pendientes = allReferidos.filter(r =>
            r.estado === 'consumido' && r.aceptacion === null
        ).length;
        const aceptados = allReferidos.filter(r => r.aceptacion === 'ACEPTADO').length;
        const rechazados = allReferidos.filter(r => r.aceptacion === 'RECHAZADO').length;

        countPendientes.textContent = pendientes;
        countTodos.textContent = allReferidos.length;
        countAceptados.textContent = aceptados;
        countRechazados.textContent = rechazados;
    }

    function filterReferidos() {
        const searchTerm = searchInput.value.toLowerCase().trim();

        filteredReferidos = allReferidos.filter(referido => {
            // Filtro de búsqueda
            const matchesSearch = !searchTerm ||
                (referido.numeroReferido && referido.numeroReferido.includes(searchTerm)) ||
                (referido.cedula && referido.cedula.includes(searchTerm)) ||
                (referido.referidoPor && referido.referidoPor.includes(searchTerm));

            // Filtro de estado
            let matchesStatus = true;
            switch (currentFilter) {
                case 'pendientes':
                    matchesStatus = referido.estado === 'consumido' && referido.aceptacion === null;
                    break;
                case 'aceptados':
                    matchesStatus = referido.aceptacion === 'ACEPTADO';
                    break;
                case 'rechazados':
                    matchesStatus = referido.aceptacion === 'RECHAZADO';
                    break;
                case 'todos':
                default:
                    matchesStatus = true;
            }

            return matchesSearch && matchesStatus;
        });

        renderReferidos();
    }

    function renderReferidos() {
        if (filteredReferidos.length === 0) {
            showEmptyState(getEmptyMessage());
            return;
        }

        referidosGrid.innerHTML = filteredReferidos.map(referido => {
            const isPendiente = referido.estado === 'consumido' && referido.aceptacion === null;
            const isAceptado = referido.aceptacion === 'ACEPTADO';
            const isRechazado = referido.aceptacion === 'RECHAZADO';
            const isHabilitado = referido.estado === 'habilitado';

            const cardClass = isPendiente ? 'pendiente' : (isAceptado ? 'aceptado' : (isRechazado ? 'rechazado' : ''));
            const badgeClass = isPendiente ? 'badge-consumido' : (isHabilitado ? 'badge-habilitado' : (isAceptado ? 'badge-aceptado' : 'badge-rechazado'));
            const badgeText = isPendiente ? 'Registrado' : (isHabilitado ? 'Sin usar' : referido.aceptacion);

            return `
                <div class="referido-card ${cardClass}" data-id="${referido.id}">
                    <div class="referido-header">
                        <div class="referido-info">
                            <div class="referido-phone">${formatPhone(referido.numeroReferido)}</div>
                            <div class="referido-cedula">${referido.cedula || 'Sin cédula registrada'}</div>
                        </div>
                        <span class="referido-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="referido-body">
                        <div class="referido-by-section">
                            <div class="referido-by-label">👤 Referido por</div>
                            <div class="referido-by-value">
                                <div class="referido-by-avatar">${getInitial(referido.referidoPor || '?')}</div>
                                <div class="referido-by-details">
                                    <div class="referido-by-name">${referido.referidoPor || 'Desconocido'}</div>
                                    <div class="referido-by-phone" style="font-size: 0.7rem; color: var(--text-muted);">Invitado Principal</div>
                                </div>
                            </div>
                        </div>
                        <div class="referido-details">
                            <div class="detail-item">
                                <div class="detail-label">Creado</div>
                                <div class="detail-value">${formatDate(referido.createdAt)}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Expira</div>
                                <div class="detail-value">${formatDate(referido.expiraEn)}</div>
                            </div>
                        </div>
                        ${isPendiente ? `
                            <div class="referido-actions">
                                <button class="ref-action-btn btn-rechazar" onclick="showRejectModal('${referido.id}')">
                                    ❌ Rechazar
                                </button>
                                <button class="ref-action-btn btn-aprobar" onclick="showApproveModal('${referido.id}')">
                                    ✅ Aprobar
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function getEmptyMessage() {
        switch (currentFilter) {
            case 'pendientes':
                return '¡No hay referidos pendientes de aprobación!';
            case 'aceptados':
                return 'No hay referidos aceptados todavía.';
            case 'rechazados':
                return 'No hay referidos rechazados.';
            default:
                return 'No se encontraron referidos.';
        }
    }

    // ==========================================
    // MODAL FUNCTIONS
    // ==========================================

    window.showApproveModal = function (tokenId) {
        pendingAction = { type: 'aprobar', tokenId };

        document.getElementById('modalIcon').className = 'modal-icon aprobar';
        document.getElementById('modalIcon').textContent = '✓';
        document.getElementById('modalTitle').textContent = '¿Aprobar referido?';
        document.getElementById('modalDescription').textContent = 'Se enviará el QR de acceso al referido automáticamente.';
        document.getElementById('modalConfirmBtn').className = 'modal-btn confirm';
        document.getElementById('modalConfirmBtn').textContent = 'Aprobar';
        document.getElementById('modalConfirmBtn').onclick = executeAction;

        confirmModal.classList.add('show');
    };

    window.showRejectModal = function (tokenId) {
        pendingAction = { type: 'rechazar', tokenId };

        document.getElementById('modalIcon').className = 'modal-icon rechazar';
        document.getElementById('modalIcon').textContent = '✕';
        document.getElementById('modalTitle').textContent = '¿Rechazar referido?';
        document.getElementById('modalDescription').textContent = 'El referido no podrá acceder al evento. Se liberará el slot.';
        document.getElementById('modalConfirmBtn').className = 'modal-btn confirm danger';
        document.getElementById('modalConfirmBtn').textContent = 'Rechazar';
        document.getElementById('modalConfirmBtn').onclick = executeAction;

        confirmModal.classList.add('show');
    };

    window.closeModal = function () {
        confirmModal.classList.remove('show');
        pendingAction = null;
    };

    async function executeAction() {
        if (!pendingAction) return;

        const btn = document.getElementById('modalConfirmBtn');
        btn.disabled = true;
        btn.textContent = 'Procesando...';

        let success = false;
        if (pendingAction.type === 'aprobar') {
            success = await aprobarReferido(pendingAction.tokenId);
        } else if (pendingAction.type === 'rechazar') {
            success = await rechazarReferido(pendingAction.tokenId);
        }

        btn.disabled = false;
        closeModal();
    }

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================

    function showLoadingState() {
        referidosGrid.innerHTML = `
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        `;
    }

    function showEmptyState(message) {
        referidosGrid.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <h3>${currentFilter === 'pendientes' ? '¡Todo al día!' : 'Sin resultados'}</h3>
                <p>${message}</p>
            </div>
        `;
    }

    function formatPhone(phone) {
        if (!phone) return '-';
        if (phone.length === 10) {
            return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
        }
        return phone;
    }

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

    function getInitial(text) {
        if (!text) return '?';
        // Si es nombre (contiene letras), devolver primera letra
        if (/[a-zA-Z]/.test(text)) {
            return text.charAt(0).toUpperCase();
        }
        // Si es número (teléfono/cédula), devolver últimos 2 dígitos
        return text.slice(-2);
    }

    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.style.background = type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(255, 255, 255, 0.9)';
        toast.style.color = type === 'error' ? '#fff' : '#000';
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

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
});
