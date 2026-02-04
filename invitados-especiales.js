// ==========================================
// GESTIÓN DE INVITADOS ESPECIALES
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const invitadosBody = document.getElementById('invitadosBody');
    const searchInput = document.getElementById('searchInput');
    const filterEstado = document.getElementById('filterEstado');
    const filterAceptacion = document.getElementById('filterAceptacion');
    const refreshBtn = document.getElementById('refreshBtn');
    const resultsCount = document.getElementById('resultsCount');
    const pagination = document.getElementById('pagination');
    const toast = document.getElementById('toast');

    // Stats elements
    const statTotal = document.getElementById('statTotal');
    const statHabilitados = document.getElementById('statHabilitados');
    const statConsumidos = document.getElementById('statConsumidos');
    const statConReferidos = document.getElementById('statConReferidos');

    // State
    let allInvitados = [];
    let filteredInvitados = [];
    let currentPage = 1;
    const itemsPerPage = 20;

    // API URLs
    const LISTAR_URL = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.LISTAR_INVITADOS_ESPECIALES);
    const ACTUALIZAR_URL = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.ACTUALIZAR_MAX_REFERIDOS);

    // Event Listeners
    refreshBtn.addEventListener('click', loadInvitados);
    searchInput.addEventListener('input', debounce(filterInvitados, 300));
    filterEstado.addEventListener('change', filterInvitados);
    filterAceptacion.addEventListener('change', filterInvitados);

    // Initial load
    loadInvitados();

    // ==========================================
    // API CALLS
    // ==========================================

    async function loadInvitados() {
        showLoadingState();

        try {
            const response = await fetch(LISTAR_URL, {
                headers: API_CONFIG.authHeaders
            });

            if (!response.ok) throw new Error('Error al cargar invitados');

            const data = await response.json();
            allInvitados = data.invitados || [];

            updateStats(data);
            filterInvitados();

        } catch (error) {
            console.error('Error:', error);
            showToast('Error al cargar los invitados', 'error');
            showEmptyState('Error al cargar los datos. Intente nuevamente.');
        }
    }

    async function updateMaxReferidos(tokenId, newValue) {
        try {
            const response = await fetch(ACTUALIZAR_URL, {
                method: 'PATCH',
                headers: API_CONFIG.authHeaders,
                body: JSON.stringify({
                    tokenId: tokenId,
                    maxReferidos: newValue
                })
            });

            if (!response.ok) throw new Error('Error al actualizar');

            // Actualizar localmente
            const invitado = allInvitados.find(i => i.id === tokenId);
            if (invitado) {
                invitado.maxReferidos = newValue;
            }

            showToast('Límite de referidos actualizado');
            return true;

        } catch (error) {
            console.error('Error:', error);
            showToast('Error al actualizar el límite', 'error');
            return false;
        }
    }

    // ==========================================
    // UI RENDERING
    // ==========================================

    function updateStats(data) {
        statTotal.textContent = data.total || allInvitados.length;

        const habilitados = allInvitados.filter(i => i.estado === 'habilitado').length;
        const consumidos = allInvitados.filter(i => i.estado === 'consumido').length;
        const conReferidos = allInvitados.filter(i => i.maxReferidos > 0).length;

        statHabilitados.textContent = habilitados;
        statConsumidos.textContent = consumidos;
        statConReferidos.textContent = conReferidos;
    }

    function filterInvitados() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const estadoFilter = filterEstado.value;
        const aceptacionFilter = filterAceptacion.value;

        filteredInvitados = allInvitados.filter(invitado => {
            // Filtro de búsqueda
            const matchesSearch = !searchTerm ||
                (invitado.telefono && invitado.telefono.includes(searchTerm)) ||
                (invitado.cedula && invitado.cedula.includes(searchTerm)) ||
                (invitado.nombre && invitado.nombre.toLowerCase().includes(searchTerm));

            // Filtro de estado
            const matchesEstado = !estadoFilter || invitado.estado === estadoFilter;

            // Filtro de aceptación
            let matchesAceptacion = true;
            if (aceptacionFilter) {
                if (aceptacionFilter === 'null') {
                    matchesAceptacion = invitado.aceptacion === null;
                } else {
                    matchesAceptacion = invitado.aceptacion === aceptacionFilter;
                }
            }

            return matchesSearch && matchesEstado && matchesAceptacion;
        });

        currentPage = 1;
        renderInvitados();
        updateResultsCount();
        renderPagination();
    }

    function renderInvitados() {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageInvitados = filteredInvitados.slice(startIndex, endIndex);

        if (pageInvitados.length === 0) {
            showEmptyState('No se encontraron invitados con los filtros aplicados.');
            return;
        }

        invitadosBody.innerHTML = pageInvitados.map(invitado => {
            const referidosCount = invitado.referidos ? invitado.referidos.length : 0;
            const hasReferidos = referidosCount > 0;

            return `
                <tr data-id="${invitado.id}">
                    <td>
                        <span style="font-family: monospace; font-weight: 500;">
                            ${formatPhone(invitado.telefono)}
                        </span>
                    </td>
                    <td>
                        ${invitado.cedula ? `
                            <div style="font-weight: 500;">${invitado.nombre || '-'}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${invitado.cedula}</div>
                        ` : '<span style="color: var(--text-muted);">Sin registrar</span>'}
                    </td>
                    <td>
                        <span class="estado-badge estado-${invitado.estado}">
                            ${invitado.estado}
                        </span>
                    </td>
                    <td>
                        ${renderAceptacionBadge(invitado.aceptacion)}
                    </td>
                    <td>
                        ${renderReferidosControl(invitado)}
                    </td>
                    <td>
                        ${hasReferidos ? `
                            <button class="expand-btn" onclick="toggleReferidos('${invitado.id}')">
                                <span>${referidosCount} referido${referidosCount > 1 ? 's' : ''}</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                            <div id="referidos-${invitado.id}" class="referidos-list" style="display: none;">
                                ${renderReferidosList(invitado.referidos)}
                            </div>
                        ` : '<span style="color: var(--text-muted);">-</span>'}
                    </td>
                    <td>
                        <div style="font-size: 0.85rem;">
                            ${formatDate(invitado.createdAt)}
                        </div>
                        ${invitado.consumidoAt ? `
                            <div style="font-size: 0.75rem; color: var(--text-muted);">
                                Usado: ${formatDate(invitado.consumidoAt)}
                            </div>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderAceptacionBadge(aceptacion) {
        if (aceptacion === 'ACEPTADO') {
            return '<span class="estado-badge estado-aceptado">Aceptado</span>';
        } else if (aceptacion === 'RECHAZADO') {
            return '<span class="estado-badge estado-rechazado">Rechazado</span>';
        } else {
            return '<span class="estado-badge estado-pendiente">-</span>';
        }
    }

    function renderReferidosControl(invitado) {
        const currentValue = invitado.maxReferidos || 0;
        const usedReferidos = invitado.referidos ? invitado.referidos.length : 0;
        const canDecrease = currentValue > usedReferidos;
        const canIncrease = currentValue < 10;

        return `
            <div class="referidos-control">
                <button class="referidos-btn" 
                        onclick="changeMaxReferidos('${invitado.id}', -1)" 
                        ${!canDecrease ? 'disabled' : ''}>
                    −
                </button>
                <div>
                    <div class="referidos-value">${currentValue}</div>
                    ${usedReferidos > 0 ? `<div class="referidos-used">(${usedReferidos} usados)</div>` : ''}
                </div>
                <button class="referidos-btn" 
                        onclick="changeMaxReferidos('${invitado.id}', 1)"
                        ${!canIncrease ? 'disabled' : ''}>
                    +
                </button>
            </div>
        `;
    }

    function renderReferidosList(referidos) {
        if (!referidos || referidos.length === 0) return '';

        return referidos.map(ref => `
            <div class="referido-item">
                <span class="telefono">${formatPhone(ref.numeroReferido)}</span>
                ${ref.cedula ? `<span>${ref.cedula}</span>` : ''}
                ${renderAceptacionBadge(ref.aceptacion)}
            </div>
        `).join('');
    }

    function renderPagination() {
        const totalPages = Math.ceil(filteredInvitados.length / itemsPerPage);

        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';

        let paginationHTML = `
            <button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                ← Anterior
            </button>
        `;

        // Mostrar solo algunas páginas
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            paginationHTML += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
            if (startPage > 2) paginationHTML += `<span style="color: var(--text-muted);">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationHTML += `<span style="color: var(--text-muted);">...</span>`;
            paginationHTML += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
        }

        paginationHTML += `
            <button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                Siguiente →
            </button>
        `;

        pagination.innerHTML = paginationHTML;
    }

    function updateResultsCount() {
        const total = filteredInvitados.length;
        const showing = Math.min(itemsPerPage, total - (currentPage - 1) * itemsPerPage);

        resultsCount.innerHTML = `
            Mostrando <strong>${showing}</strong> de <strong>${total}</strong> invitados
            ${allInvitados.length !== total ? ` (${allInvitados.length} total)` : ''}
        `;
    }

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================

    function showLoadingState() {
        invitadosBody.innerHTML = `
            <tr><td colspan="7"><div class="skeleton skeleton-row"></div></td></tr>
            <tr><td colspan="7"><div class="skeleton skeleton-row"></div></td></tr>
            <tr><td colspan="7"><div class="skeleton skeleton-row"></div></td></tr>
            <tr><td colspan="7"><div class="skeleton skeleton-row"></div></td></tr>
        `;
        resultsCount.textContent = 'Cargando invitados...';
    }

    function showEmptyState(message) {
        invitadosBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <h3>Sin resultados</h3>
                        <p>${message}</p>
                    </div>
                </td>
            </tr>
        `;
    }

    function formatPhone(phone) {
        if (!phone) return '-';
        // Formato: 099-XXX-XXXX
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
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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

    // ==========================================
    // GLOBAL FUNCTIONS (needed for inline onclick)
    // ==========================================

    window.toggleReferidos = function (id) {
        const list = document.getElementById(`referidos-${id}`);
        const btn = list.previousElementSibling;

        if (list.style.display === 'none') {
            list.style.display = 'block';
            btn.classList.add('expanded');
        } else {
            list.style.display = 'none';
            btn.classList.remove('expanded');
        }
    };

    window.changeMaxReferidos = async function (id, delta) {
        const invitado = allInvitados.find(i => i.id === id);
        if (!invitado) return;

        const newValue = (invitado.maxReferidos || 0) + delta;
        const usedReferidos = invitado.referidos ? invitado.referidos.length : 0;

        // Validaciones
        if (newValue < usedReferidos) {
            showToast(`No puedes reducir a menos de ${usedReferidos} (referidos ya usados)`, 'error');
            return;
        }
        if (newValue > 10) {
            showToast('El máximo permitido es 10 referidos', 'error');
            return;
        }
        if (newValue < 0) return;

        const success = await updateMaxReferidos(id, newValue);
        if (success) {
            // Re-renderizar solo la fila afectada
            const row = document.querySelector(`tr[data-id="${id}"]`);
            if (row) {
                const cell = row.querySelector('td:nth-child(5)');
                if (cell) {
                    cell.innerHTML = renderReferidosControl(invitado);
                }
            }
        }
    };

    window.goToPage = function (page) {
        const totalPages = Math.ceil(filteredInvitados.length / itemsPerPage);
        if (page < 1 || page > totalPages) return;

        currentPage = page;
        renderInvitados();
        updateResultsCount();
        renderPagination();

        // Scroll al inicio de la tabla
        document.querySelector('.invitados-table-container').scrollIntoView({ behavior: 'smooth' });
    };
});
