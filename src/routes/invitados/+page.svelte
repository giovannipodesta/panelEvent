<script>
	import { onMount } from 'svelte';
	import { toastStore as toast } from '$lib/stores/toast.svelte.js';
	import { getInvitadosEspeciales, updateMaxReferidos, revocarInvitacion, eliminarRegistro, anularQR, getInvitadoDetalle } from '$lib/api/endpoints.js';
	import { formatPhone, formatDate, debounce } from '$lib/utils/index.js';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import Modal from '$lib/components/Modal.svelte';

	// $state.raw: API data is read-only, no deep proxy needed (perf win on low-end devices)
	let allInvitados = $state.raw([]);
	let searchTerm = $state('');
	let filterEstado = $state('');
	let filterAceptacion = $state('');
	let currentPage = $state(1);
	let loading = $state(true);
	const itemsPerPage = 20;

	// Expanded referidos
	let expandedRows = $state(new Set());

	// Detail modal
	let detailModal = $state(false);
	let detailData = $state(null);
	let detailLoading = $state(false);

	// Action states
	let actionLoading = $state(null);

	// $derived.by: returns value directly, recalculates only when dependencies change (push-pull)
	let filtered = $derived.by(() => {
		return allInvitados.filter(inv => {
			const matchSearch = !searchTerm ||
				(inv.telefono && inv.telefono.includes(searchTerm)) ||
				(inv.cedula && inv.cedula.includes(searchTerm)) ||
				(inv.nombre && inv.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

			const matchEstado = !filterEstado || inv.estado === filterEstado;

			let matchAceptacion = true;
			if (filterAceptacion) {
				if (filterAceptacion === 'null') {
					matchAceptacion = inv.aceptacion === null;
				} else {
					matchAceptacion = inv.aceptacion === filterAceptacion;
				}
			}

			return matchSearch && matchEstado && matchAceptacion;
		});
	});

	// Derived stats: auto-recalculate when allInvitados changes, no manual updateStats()
	let statTotal = $derived(allInvitados.length);
	let statHabilitados = $derived(allInvitados.filter(i => i.estado === 'habilitado').length);
	let statConsumidos = $derived(allInvitados.filter(i => i.estado === 'consumido').length);
	let statConReferidos = $derived(allInvitados.filter(i => i.maxReferidos > 0).length);

	let totalPages = $derived(Math.ceil(filtered.length / itemsPerPage));
	let pageItems = $derived.by(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filtered.slice(start, start + itemsPerPage);
	});

	onMount(() => {
		loadInvitados();
	});

	async function loadInvitados() {
		loading = true;
		try {
			const data = await getInvitadosEspeciales();
			// Reassign $state.raw: triggers reactivity, all $derived stats auto-update
			allInvitados = data.invitados || [];
		} catch (e) {
			console.error(e);
			toast.show('Error al cargar los invitados', 'error');
		} finally {
			loading = false;
		}
	}

	function onSearchInput(e) {
		searchTerm = e.target.value;
		currentPage = 1;
	}

	const debouncedSearch = debounce(onSearchInput, 300);

	function goToPage(page) {
		if (page < 1 || page > totalPages) return;
		currentPage = page;
	}

	function toggleReferidos(id) {
		const next = new Set(expandedRows);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedRows = next;
	}

	async function changeMaxReferidos(id, delta) {
		const inv = allInvitados.find(i => i.id === id);
		if (!inv) return;

		const newValue = (inv.maxReferidos || 0) + delta;
		const usedReferidos = inv.referidos ? inv.referidos.length : 0;

		if (newValue < usedReferidos) {
			toast.show(`No puedes reducir a menos de ${usedReferidos} (referidos ya usados)`, 'error');
			return;
		}
		if (newValue > 10 || newValue < 0) return;

		try {
			await updateMaxReferidos(id, newValue);
			// $state.raw requires full reassignment to trigger reactivity
			allInvitados = allInvitados.map(i => i.id === id ? { ...i, maxReferidos: newValue } : i);
			toast.show('Límite de referidos actualizado');
		} catch (e) {
			toast.show('Error al actualizar el límite', 'error');
		}
	}

	function aceptacionBadge(aceptacion) {
		if (aceptacion === 'ACEPTADO') return 'aceptado';
		if (aceptacion === 'RECHAZADO') return 'rechazado';
		return 'pendiente';
	}

	async function openDetail(telefono) {
		detailLoading = true;
		detailModal = true;
		detailData = null;
		try {
			const data = await getInvitadoDetalle(telefono);
			detailData = data.invitado || data;
		} catch (e) {
			toast.show('Error al cargar detalle', 'error');
			detailModal = false;
		} finally {
			detailLoading = false;
		}
	}

	async function handleRevocar(tokenId) {
		if (!confirm('¿Revocar esta invitación? Se cancelarán envíos pendientes.')) return;
		actionLoading = tokenId;
		try {
			await revocarInvitacion(tokenId);
			toast.show('Invitación revocada');
			allInvitados = allInvitados.map(i =>
				i.tokenId === tokenId ? { ...i, estado: 'consumido', aceptacion: 'RECHAZADO' } : i
			);
		} catch (e) {
			toast.show(e.message || 'Error al revocar', 'error');
		} finally {
			actionLoading = null;
		}
	}

	async function handleAnularQR(inv) {
		if (!inv.usuario?.id_uuid) { toast.show('Sin registro de usuario', 'error'); return; }
		if (!confirm('¿Anular el QR de este usuario? Se desaprobará.')) return;
		actionLoading = inv.tokenId;
		try {
			await anularQR(inv.usuario.id_uuid);
			toast.show('QR anulado');
			await loadInvitados();
		} catch (e) {
			toast.show(e.message || 'Error al anular QR', 'error');
		} finally {
			actionLoading = null;
		}
	}

	async function handleEliminar(inv) {
		if (!inv.usuario?.id_uuid) { toast.show('Sin registro de usuario', 'error'); return; }
		if (!confirm('¿Eliminar registro completo? IRREVERSIBLE.')) return;
		actionLoading = inv.tokenId;
		try {
			await eliminarRegistro(inv.usuario.id_uuid);
			toast.show('Registro eliminado');
			allInvitados = allInvitados.filter(i => i.tokenId !== inv.tokenId);
		} catch (e) {
			toast.show(e.message || 'Error al eliminar', 'error');
		} finally {
			actionLoading = null;
		}
	}

	function aceptacionLabel(aceptacion) {
		if (aceptacion === 'ACEPTADO') return 'Aceptado';
		if (aceptacion === 'RECHAZADO') return 'Rechazado';
		return '-';
	}

	function getPaginationPages() {
		const pages = [];
		const maxVisible = 5;
		let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
		let end = Math.min(totalPages, start + maxVisible - 1);
		if (end - start + 1 < maxVisible) {
			start = Math.max(1, end - maxVisible + 1);
		}
		for (let i = start; i <= end; i++) pages.push(i);
		return pages;
	}
</script>

<svelte:head>
	<title>Invitados Especiales - Panel de Gestión</title>
</svelte:head>

<section>
	<div class="section-header">
		<div>
			<h2>Invitados VIP</h2>
			<p class="section-desc">Lista de todas las invitaciones enviadas</p>
		</div>
		<button class="btn btn-sm btn-secondary" onclick={loadInvitados}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 2v6h-6"></path>
				<path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
				<path d="M3 22v-6h6"></path>
				<path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
			</svg>
			Actualizar
		</button>
	</div>

	<!-- Stats -->
	<div class="stats-grid">
		<StatCard icon="📊" label="Total Invitados" value={statTotal} />
		<StatCard icon="✅" label="Habilitados" value={statHabilitados} />
		<StatCard icon="🎟️" label="Consumidos" value={statConsumidos} />
		<StatCard icon="👥" label="Con Referidos" value={statConReferidos} />
	</div>

	<!-- Search -->
	<input type="text" class="input" placeholder="Buscar por teléfono, cédula o nombre..." oninput={debouncedSearch} style="margin-bottom: 0.75rem;" />

	<!-- Filters -->
	<div class="status-tabs" style="margin-bottom: 1rem;">
		<button class="status-tab" class:active={filterEstado === '' && filterAceptacion === ''} onclick={() => { filterEstado = ''; filterAceptacion = ''; currentPage = 1; }}>
			Todos
			<span class="tab-count">{allInvitados.length}</span>
		</button>
		<button class="status-tab" class:active={filterEstado === 'habilitado'} onclick={() => { filterEstado = 'habilitado'; filterAceptacion = ''; currentPage = 1; }}>
			Habilitados
			<span class="tab-count">{statHabilitados}</span>
		</button>
		<button class="status-tab" class:active={filterEstado === 'consumido'} onclick={() => { filterEstado = 'consumido'; filterAceptacion = ''; currentPage = 1; }}>
			Consumidos
			<span class="tab-count">{statConsumidos}</span>
		</button>
		<button class="status-tab" class:active={filterAceptacion === 'ACEPTADO'} onclick={() => { filterAceptacion = 'ACEPTADO'; filterEstado = ''; currentPage = 1; }}>
			Aceptados
		</button>
	</div>

	<!-- Results count -->
	<p class="results-count">
		Mostrando <strong>{pageItems.length}</strong> de <strong>{filtered.length}</strong> invitados
		{#if filtered.length !== allInvitados.length}<span style="opacity: 0.7;">({allInvitados.length} total)</span>{/if}
	</p>

	<!-- Card List -->
	{#if loading}
		<div class="skeleton-card"></div>
		<div class="skeleton-card"></div>
		<div class="skeleton-card"></div>
	{:else if pageItems.length === 0}
		<div class="empty-state">
			<div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🔍</div>
			<h3>Sin resultados</h3>
			<p>No se encontraron invitados con los filtros aplicados.</p>
		</div>
	{:else}
		<div class="invitado-card-list">
			{#each pageItems as inv, i (inv.id ?? `inv-${i}`)}
				<div class="invitado-card" class:status-habilitado={inv.estado === 'habilitado'} class:status-consumido={inv.estado === 'consumido'}>
					<!-- Header: phone + name + badges -->
					<div class="invitado-card-header">
						<div class="invitado-card-main">
							<div class="invitado-card-phone">{formatPhone(inv.telefono)}</div>
							{#if inv.nombre}
								<div class="invitado-card-name">{inv.nombre}</div>
							{/if}
							{#if inv.cedula}
								<div class="invitado-card-sub">CI: {inv.cedula}</div>
							{:else}
								<div class="invitado-card-sub" style="color: var(--text-muted);">Sin registrar</div>
							{/if}
						</div>
						<div class="invitado-card-badges">
							<StatusBadge status={inv.estado} size="sm" />
							<StatusBadge status={aceptacionBadge(inv.aceptacion)} size="sm" />
						</div>
					</div>

					<!-- Info row: referidos + date -->
					<div class="invitado-card-info-row">
						<div class="invitado-card-ref">
							<span class="invitado-card-ref-label">Referidos:</span>
							<div class="referidos-control">
								<button class="referidos-btn" disabled={inv.maxReferidos <= (inv.referidos?.length || 0)} onclick={() => changeMaxReferidos(inv.id, -1)}>−</button>
								<div>
									<div class="referidos-value">{inv.maxReferidos || 0}</div>
									{#if inv.referidos?.length > 0}
										<div class="referidos-used">({inv.referidos.length} usados)</div>
									{/if}
								</div>
								<button class="referidos-btn" disabled={inv.maxReferidos >= 10} onclick={() => changeMaxReferidos(inv.id, 1)}>+</button>
							</div>
						</div>
						<div class="invitado-card-date">
							<div>{formatDate(inv.createdAt)}</div>
							{#if inv.consumidoAt}
								<div style="font-size: 0.75rem; color: var(--text-muted);">Usado: {formatDate(inv.consumidoAt)}</div>
							{/if}
						</div>
					</div>

					<!-- Expandable referidos -->
					{#if inv.referidos?.length > 0}
						<button class="invitado-expand-btn" onclick={() => toggleReferidos(inv.id)}>
							<span>Ver {inv.referidos.length} referido{inv.referidos.length > 1 ? 's' : ''}</span>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s; transform: rotate({expandedRows.has(inv.id) ? '180' : '0'}deg);">
								<polyline points="6 9 12 15 18 9"></polyline>
							</svg>
						</button>
						{#if expandedRows.has(inv.id)}
							<div class="invitado-referidos-list">
								{#each inv.referidos as ref}
									<div class="invitado-ref-item">
										<span style="font-family: monospace;">{formatPhone(ref.numeroReferido)}</span>
										{#if ref.cedula}<span style="color: var(--text-muted);">{ref.cedula}</span>{/if}
										<StatusBadge status={aceptacionBadge(ref.aceptacion)} size="sm" />
									</div>
								{/each}
							</div>
						{/if}
					{/if}

					<!-- Actions -->
					<div class="invitado-card-actions">
						<button class="btn btn-sm btn-secondary" onclick={() => openDetail(inv.telefono)} disabled={actionLoading === inv.tokenId}>
							Ver Detalle
						</button>
						{#if inv.estado === 'habilitado'}
							<button class="btn btn-sm btn-danger-outline" onclick={() => handleRevocar(inv.tokenId)} disabled={actionLoading === inv.tokenId}>
								Revocar
							</button>
						{/if}
						{#if inv.qrEnviado && inv.usuario?.id_uuid}
							<button class="btn btn-sm btn-danger-outline" onclick={() => handleAnularQR(inv)} disabled={actionLoading === inv.tokenId}>
								Anular QR
							</button>
						{/if}
						{#if inv.usuario?.id_uuid}
							<button class="btn btn-sm btn-danger-outline" onclick={() => handleEliminar(inv)} disabled={actionLoading === inv.tokenId}>
								Eliminar
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="pagination">
				<button class="page-btn" disabled={currentPage === 1} onclick={() => goToPage(currentPage - 1)}>← Anterior</button>
				{#each getPaginationPages() as p}
					<button class="page-btn" class:active={p === currentPage} onclick={() => goToPage(p)}>{p}</button>
				{/each}
				<button class="page-btn" disabled={currentPage === totalPages} onclick={() => goToPage(currentPage + 1)}>Siguiente →</button>
			</div>
		{/if}
	{/if}
</section>

<!-- Detail Modal -->
{#if detailModal}
	<Modal title="Detalle de Invitado" onclose={() => detailModal = false}>
		{#if detailLoading}
			<div style="text-align: center; padding: 2rem;">
				<span class="loader"></span>
			</div>
		{:else if detailData}
			<div class="detail-section">
				<h4>Token</h4>
				<div class="detail-grid">
					<span class="detail-label">Teléfono:</span>
					<span>{formatPhone(detailData.token?.telefono || '')}</span>
					<span class="detail-label">Estado:</span>
					<span><StatusBadge status={detailData.token?.estado || '-'} size="sm" /></span>
					<span class="detail-label">Aceptación:</span>
					<span><StatusBadge status={aceptacionBadge(detailData.token?.aceptacion)} size="sm" /></span>
					<span class="detail-label">Max Referidos:</span>
					<span>{detailData.token?.maxReferidos ?? '-'}</span>
				</div>
			</div>

			{#if detailData.usuario}
				<div class="detail-section">
					<h4>Usuario Registrado</h4>
					<div class="detail-grid">
						<span class="detail-label">Nombre:</span>
						<span>{detailData.usuario.nombre || '-'}</span>
						<span class="detail-label">Cédula:</span>
						<span>{detailData.usuario.cedula || '-'}</span>
						<span class="detail-label">Aprobado:</span>
						<span>{detailData.usuario.aprobado ? '✅ Sí' : '❌ No'}</span>
					</div>
				</div>
			{/if}

			{#if detailData.referidoPor}
				<div class="detail-section">
					<h4>Referido por</h4>
					<p>{detailData.referidoPor.nombre || detailData.referidoPor.telefono || '-'}</p>
				</div>
			{/if}

			{#if detailData.referidos?.length > 0}
				<div class="detail-section">
					<h4>Referidos ({detailData.referidos.length})</h4>
					{#each detailData.referidos as ref}
						<div style="display: flex; gap: 0.5rem; align-items: center; padding: 0.25rem 0; font-size: 0.85rem;">
							<span style="font-family: monospace;">{formatPhone(ref.telefono)}</span>
							<StatusBadge status={ref.estado} size="sm" />
							<StatusBadge status={aceptacionBadge(ref.aceptacion)} size="sm" />
						</div>
					{/each}
				</div>
			{/if}

			{#if detailData.mensajes?.length > 0}
				<div class="detail-section">
					<h4>Mensajes ({detailData.mensajes.length})</h4>
					{#each detailData.mensajes as msg}
						<div style="display: flex; gap: 0.5rem; align-items: center; padding: 0.25rem 0; font-size: 0.8rem;">
							<span class="badge badge-info">{msg.tipo}</span>
							<span>{msg.estado}</span>
							{#if msg.enviadoAt}<span style="color: var(--text-muted);">{formatDate(msg.enviadoAt)}</span>{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if detailData.enviosProgramados?.length > 0}
				<div class="detail-section">
					<h4>Envíos Programados ({detailData.enviosProgramados.length})</h4>
					{#each detailData.enviosProgramados as envio}
						<div style="font-size: 0.8rem; padding: 0.25rem 0;">
							{envio.tipo || 'Envío'} — {envio.estado || '-'}
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</Modal>
{/if}

<style>
	.invitado-card-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.invitado-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1rem 1.25rem;
		border-left: 3px solid var(--text-muted);
	}
	.invitado-card.status-habilitado { border-left-color: var(--success); }
	.invitado-card.status-consumido { border-left-color: var(--accent-purple); }

	.invitado-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.invitado-card-main { flex: 1; min-width: 0; }
	.invitado-card-phone { font-family: monospace; font-weight: 600; font-size: 1.05rem; }
	.invitado-card-name { font-weight: 500; font-size: 0.95rem; margin-top: 0.15rem; }
	.invitado-card-sub { font-size: 0.85rem; color: var(--text-muted); }

	.invitado-card-badges {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		align-items: flex-end;
	}

	.invitado-card-info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.75rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-color);
	}

	.invitado-card-ref {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.invitado-card-ref-label {
		font-size: 0.85rem;
		color: var(--text-muted);
		font-weight: 500;
	}

	.invitado-card-date {
		font-size: 0.85rem;
		color: var(--text-secondary);
		text-align: right;
	}

	.invitado-expand-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0;
		background: none;
		border: none;
		border-top: 1px solid var(--border-color);
		color: var(--accent-purple);
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
	}

	.invitado-referidos-list {
		padding: 0.5rem 0;
	}

	.invitado-ref-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0;
		font-size: 0.85rem;
	}

	.invitado-card-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-color);
	}

	.invitado-card-actions .btn {
		flex: 1;
		min-width: max-content;
		justify-content: center;
	}

	.detail-section {
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(255,255,255,0.06);
	}
	.detail-section h4 {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}
	.detail-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25rem 0.75rem;
		font-size: 0.95rem;
	}
</style>
