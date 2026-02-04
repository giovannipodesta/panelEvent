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

        const groups = groupReferidos(filteredReferidos);

        referidosGrid.innerHTML = Object.values(groups).map(group => {
            const { referrerName, referrerCedula, items, stats } = group;
            const groupId = 'group-' + (referrerCedula || referrerName.replace(/\s+/g, '-')).replace(/[^a-zA-Z0-9-]/g, '');
            const hasPendientes = stats.pendientes > 0;

            // Determine card border/status based on overall status
            let cardStatusClass = '';
            if (stats.pendientes > 0) cardStatusClass = 'status-pending';
            else if (stats.rechazados === items.length) cardStatusClass = 'status-rejected';
            else cardStatusClass = 'status-accepted';

            return `
                <div class="referido-group-card ${cardStatusClass}">
                    <div class="group-header">
                        <div class="referrer-info">
                            <div class="referrer-avatar">${getInitial(referrerName)}</div>
                            <div class="referrer-details">
                                <div class="referrer-label">Referido por</div>
                                <div class="referrer-name">${referrerName}</div>
                                <div class="referrer-cedula">${referrerCedula || ''}</div>
                            </div>
                        </div>
                        <div class="group-meta">
                            <div class="group-badges">
                                <span class="badge-count">${items.length} Invitados</span>
                                ${stats.pendientes > 0 ? `<span class="badge-pending">${stats.pendientes} Pendientes</span>` : ''}
                            </div>
                            <button class="expand-group-btn" onclick="toggleGroup('${groupId}', this)">
                                <span>Ver detalles</span>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div id="${groupId}" class="group-content" style="display: none;">
                        <div class="referidos-list">
                            ${renderGroupItems(items)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function groupReferidos(items) {
        const groups = {};

        items.forEach(item => {
            const key = item.referidoPorCedula || item.referidoPor || 'Desconocido';

            if (!groups[key]) {
                groups[key] = {
                    referrerName: item.referidoPor || 'Desconocido',
                    referrerCedula: item.referidoPorCedula,
                    items: [],
                    stats: { pendientes: 0, aceptados: 0, rechazados: 0 }
                };
            }

            groups[key].items.push(item);

            // Update stats
            if (item.estado === 'consumido' && item.aceptacion === null) {
                groups[key].stats.pendientes++;
            } else if (item.aceptacion === 'ACEPTADO') {
                groups[key].stats.aceptados++;
            } else if (item.aceptacion === 'RECHAZADO') {
                groups[key].stats.rechazados++;
            }
        });

        return groups;
    }

    function renderGroupItems(items) {
        return items.map(referido => {
            const isPendiente = referido.estado === 'consumido' && referido.aceptacion === null;
            const isAceptado = referido.aceptacion === 'ACEPTADO';
            const isRechazado = referido.aceptacion === 'RECHAZADO';

            let statusBadge = '';
            if (isPendiente) statusBadge = '<span class="status-badge badge-pendiente">Pendiente</span>';
            else if (isAceptado) statusBadge = '<span class="status-badge badge-aceptado">Aceptado</span>';
            else if (isRechazado) statusBadge = '<span class="status-badge badge-rechazado">Rechazado</span>';
            else statusBadge = '<span class="status-badge badge-sin-usar">Sin Usar</span>';

            // Safe onclick wrapper to avoid triggering when clicking small buttons
            const rowClick = `openDetailsModal('${referido.id}')`;

            return `
                <div class="referido-item-row" onclick="${rowClick}">
                    <div class="item-info">
                        <div class="item-main">
                            <span class="item-phone">${formatPhone(referido.numeroReferido)}</span>
                            ${statusBadge}
                        </div>
                        <div class="item-sub">
                            <span class="item-cedula">${referido.cedula || 'Sin Cédula'}</span>
                            ${referido.nombre ? ` • <span>${referido.nombre}</span>` : ''}
                        </div>
                    </div>
                    <div class="item-actions">
                        ${isPendiente ? `
                            <button class="action-btn btn-reject-sm" onclick="event.stopPropagation(); showRejectModal('${referido.id}')" title="Rechazar">
                                ✕
                            </button>
                            <button class="action-btn btn-approve-sm" onclick="event.stopPropagation(); showApproveModal('${referido.id}')" title="Aprobar">
                                ✓
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    window.toggleGroup = function (groupId, btn) {
        const content = document.getElementById(groupId);
        if (!content) return;

        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';

        if (isHidden) {
            btn.classList.add('expanded');
            btn.querySelector('span').textContent = 'Ocultar';
        } else {
            btn.classList.remove('expanded');
            btn.querySelector('span').textContent = 'Ver detalles';
        }
    };

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

    window.closeDetailsModal = function () {
        document.getElementById('detailsModal').classList.remove('show');
    };

    window.openDetailsModal = function (id) {
        const referido = allReferidos.find(r => r.id === id);
        if (!referido) return;

        // Populate fields
        document.getElementById('detailAvatar').textContent = getInitial(referido.nombre || referido.numeroReferido);
        document.getElementById('detailPhone').textContent = formatPhone(referido.numeroReferido);
        document.getElementById('detailName').textContent = referido.nombre || 'Nombre no registrado';
        document.getElementById('detailCedula').textContent = 'CI: ' + (referido.cedula || 'No registrada');

        document.getElementById('detailStatus').innerHTML = getStatusBadge(referido);
        document.getElementById('detailReferrer').textContent = referido.referidoPor || 'Desconocido';
        document.getElementById('detailCreated').textContent = formatDate(referido.createdAt);
        document.getElementById('detailExpires').textContent = formatDate(referido.expiraEn);

        // Actions
        const actionsContainer = document.getElementById('detailActions');
        actionsContainer.innerHTML = '';

        if (referido.estado === 'consumido' && referido.aceptacion === null) {
            actionsContainer.innerHTML = `
                <button class="details-btn btn-large-reject" onclick="showRejectModal('${referido.id}'); closeDetailsModal();">
                    ✕ Rechazar
                </button>
                <button class="details-btn btn-large-approve" onclick="showApproveModal('${referido.id}'); closeDetailsModal();">
                    ✓ Aprobar Solicitud
                </button>
            `;
        } else if (referido.aceptacion === 'ACEPTADO') {
            actionsContainer.innerHTML = `<div style="width: 100%; text-align: center; color: var(--success); font-weight: 600;">✅ Ya aprobado</div>`;
        } else if (referido.aceptacion === 'RECHAZADO') {
            actionsContainer.innerHTML = `<div style="width: 100%; text-align: center; color: var(--danger); font-weight: 600;">❌ Rechazado</div>`;
        }

        document.getElementById('detailsModal').classList.add('show');
    };

    function getStatusBadge(referido) {
        if (referido.aceptacion === 'ACEPTADO') return '<span class="status-badge badge-aceptado">Aceptado</span>';
        if (referido.aceptacion === 'RECHAZADO') return '<span class="status-badge badge-rechazado">Rechazado</span>';
        if (referido.estado === 'consumido') return '<span class="status-badge badge-pendiente">Pendiente</span>';
        return '<span class="status-badge badge-sin-usar">Sin Usar</span>';
    }

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

        if (success) {
            filterReferidos();
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
