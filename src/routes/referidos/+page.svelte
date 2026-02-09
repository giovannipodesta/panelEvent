<script>
	import { onMount } from 'svelte';
	import { toastStore as toast } from '$lib/stores/toast.svelte.js';
	import { getReferidos, aprobarReferido, rechazarReferido, revocarInvitacion, anularQR, eliminarRegistro } from '$lib/api/endpoints.js';
	import { formatPhone, formatDate, getInitials, debounce } from '$lib/utils/index.js';
	import Modal from '$lib/components/Modal.svelte';
	import StatCard from '$lib/components/StatCard.svelte';

	let allReferidos = $state.raw([]);
	let searchTerm = $state('');
	let currentFilter = $state('pendientes');
	let loading = $state(true);

	// Modal state
	let modalOpen = $state(false);
	let modalAction = $state(null); // { type: 'aprobar'|'rechazar', tokenId: string }
	let modalLoading = $state(false);

	// Detail modal state
	let detailsOpen = $state(false);
	let selectedReferido = $state(null);

	// Stats
	let statTotal = $state(0);
	let statPendientes = $state(0);
	let statConfirmados = $state(0);
	let statRechazados = $state(0);

	// Tab counts
	let countPendientes = $derived(allReferidos.filter(r => r.estado === 'consumido' && r.aceptacion === null).length);
	let countAceptados = $derived(allReferidos.filter(r => r.aceptacion === 'ACEPTADO').length);
	let countRechazados = $derived(allReferidos.filter(r => r.aceptacion === 'RECHAZADO').length);

	let filtered = $derived.by(() => {
		return allReferidos.filter(ref => {
			const matchSearch = !searchTerm ||
				(ref.numeroReferido && ref.numeroReferido.includes(searchTerm)) ||
				(ref.cedula && ref.cedula.includes(searchTerm)) ||
				(ref.referidoPor && ref.referidoPor.includes(searchTerm));

			let matchStatus = true;
			switch (currentFilter) {
				case 'pendientes':
					matchStatus = ref.estado === 'consumido' && ref.aceptacion === null;
					break;
				case 'aceptados':
					matchStatus = ref.aceptacion === 'ACEPTADO';
					break;
				case 'rechazados':
					matchStatus = ref.aceptacion === 'RECHAZADO';
					break;
				case 'todos':
				default:
					matchStatus = true;
			}

			return matchSearch && matchStatus;
		});
	});

	let grouped = $derived.by(() => {
		const groups = {};
		for (const item of filtered) {
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
			if (item.estado === 'consumido' && item.aceptacion === null) groups[key].stats.pendientes++;
			else if (item.aceptacion === 'ACEPTADO') groups[key].stats.aceptados++;
			else if (item.aceptacion === 'RECHAZADO') groups[key].stats.rechazados++;
		}
		return groups;
	});

	// Expanded groups
	let expandedGroups = $state(new Set());

	onMount(() => {
		loadReferidosData();
	});

	async function loadReferidosData() {
		loading = true;
		try {
			const data = await getReferidos();
			allReferidos = data.invitados || [];
			statTotal = data.total || allReferidos.length;
			statPendientes = data.pendientes || 0;
			statConfirmados = data.confirmados || 0;
			statRechazados = allReferidos.filter(r => r.aceptacion === 'RECHAZADO').length;
		} catch (e) {
			console.error(e);
			toast.show('Error al cargar los referidos', 'error');
		} finally {
			loading = false;
		}
	}

	function toggleGroup(key) {
		const next = new Set(expandedGroups);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		expandedGroups = next;
	}

	function showApproveModal(tokenId) {
		modalAction = { type: 'aprobar', tokenId };
		modalOpen = true;
		detailsOpen = false;
	}

	function showRejectModal(tokenId) {
		modalAction = { type: 'rechazar', tokenId };
		modalOpen = true;
		detailsOpen = false;
	}

	async function executeAction() {
		if (!modalAction) return;
		modalLoading = true;
		try {
			if (modalAction.type === 'aprobar') {
				await aprobarReferido(modalAction.tokenId);
				toast.show('✅ Referido aprobado y QR enviado');
			} else {
				await rechazarReferido(modalAction.tokenId);
				toast.show('Referido rechazado');
			}
			// $state.raw: reassign full array to trigger reactivity
			allReferidos = allReferidos.map(r => {
				if (r.id === modalAction.tokenId) {
					return { ...r, aceptacion: modalAction.type === 'aprobar' ? 'ACEPTADO' : 'RECHAZADO', estado: 'consumido' };
				}
				return r;
			});
		} catch (e) {
			toast.show(e.message || 'Error al procesar', 'error');
		} finally {
			modalLoading = false;
			modalOpen = false;
			modalAction = null;
		}
	}

	function openDetails(id) {
		selectedReferido = allReferidos.find(r => r.id === id) || null;
		if (selectedReferido) detailsOpen = true;
	}

	function getStatusClass(group) {
		if (group.stats.pendientes > 0) return 'status-pending';
		if (group.stats.rechazados === group.items.length) return 'status-rejected';
		return 'status-accepted';
	}

	function getItemStatusLabel(ref) {
		if (ref.estado === 'consumido' && ref.aceptacion === null) return 'Pendiente';
		if (ref.aceptacion === 'ACEPTADO') return 'Aceptado';
		if (ref.aceptacion === 'RECHAZADO') return 'Rechazado';
		return 'Sin Usar';
	}

	function getItemStatusClass(ref) {
		if (ref.estado === 'consumido' && ref.aceptacion === null) return 'badge-warning';
		if (ref.aceptacion === 'ACEPTADO') return 'badge-success';
		if (ref.aceptacion === 'RECHAZADO') return 'badge-danger';
		return 'badge-muted';
	}

	function isPendiente(ref) {
		return ref.estado === 'consumido' && ref.aceptacion === null;
	}

	const debouncedSearch = debounce((e) => {
		searchTerm = e.target.value.toLowerCase().trim();
	}, 300);
</script>

<svelte:head>
	<title>Referidos - Panel de Gestión</title>
</svelte:head>

<section>
	<div class="section-header">
		<div>
			<h2>Referidos (Acompañantes)</h2>
			<p class="section-desc">Aprueba o rechaza los acompañantes de invitados VIP</p>
		</div>
		<button class="btn btn-sm btn-secondary" onclick={loadReferidosData}>
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
		<StatCard icon="📊" label="Total" value={statTotal} />
		<StatCard icon="⏳" label="Pendientes" value={statPendientes} />
		<StatCard icon="✅" label="Confirmados" value={statConfirmados} />
		<StatCard icon="❌" label="Rechazados" value={statRechazados} />
	</div>

	<!-- Search -->
	<input type="text" class="input" placeholder="Buscar por teléfono, cédula o nombre..." oninput={debouncedSearch} style="margin-bottom: 1rem;" />

	<!-- Status Tabs -->
	<div class="status-tabs">
		<button class="status-tab" class:active={currentFilter === 'pendientes'} onclick={() => currentFilter = 'pendientes'}>
			Pendientes
			<span class="tab-count">{countPendientes}</span>
		</button>
		<button class="status-tab" class:active={currentFilter === 'todos'} onclick={() => currentFilter = 'todos'}>
			Todos
			<span class="tab-count">{allReferidos.length}</span>
		</button>
		<button class="status-tab" class:active={currentFilter === 'aceptados'} onclick={() => currentFilter = 'aceptados'}>
			Aceptados
			<span class="tab-count">{countAceptados}</span>
		</button>
		<button class="status-tab" class:active={currentFilter === 'rechazados'} onclick={() => currentFilter = 'rechazados'}>
			Rechazados
			<span class="tab-count">{countRechazados}</span>
		</button>
	</div>

	<!-- Content -->
	{#if loading}
		<div class="skeleton-card"></div>
		<div class="skeleton-card"></div>
		<div class="skeleton-card"></div>
	{:else if Object.keys(grouped).length === 0}
		<div class="empty-state">
			<h3>{currentFilter === 'pendientes' ? '¡Todo al día!' : 'Sin resultados'}</h3>
			<p>
				{#if currentFilter === 'pendientes'}¡No hay referidos pendientes de aprobación!
				{:else if currentFilter === 'aceptados'}No hay referidos aceptados todavía.
				{:else if currentFilter === 'rechazados'}No hay referidos rechazados.
				{:else}No se encontraron referidos.
				{/if}
			</p>
		</div>
	{:else}
		{#each Object.entries(grouped) as [key, group]}
			<div class="referido-group-card {getStatusClass(group)}">
				<div class="group-header">
					<div class="referrer-info">
						<div class="referrer-avatar">{getInitials(group.referrerName)}</div>
						<div class="referrer-details">
							<div class="referrer-label">Referido por</div>
							<div class="referrer-name">{group.referrerName}</div>
							{#if group.referrerCedula}
								<div class="referrer-cedula">{group.referrerCedula}</div>
							{/if}
						</div>
					</div>
					<div class="group-meta">
						<div class="group-badges">
							<span class="badge-count">{group.items.length} Invitados</span>
							{#if group.stats.pendientes > 0}
								<span class="badge-pending">{group.stats.pendientes} Pendientes</span>
							{/if}
						</div>
						<button class="expand-group-btn" class:expanded={expandedGroups.has(key)} onclick={() => toggleGroup(key)}>
							<span>{expandedGroups.has(key) ? 'Ocultar' : 'Ver detalles'}</span>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="6 9 12 15 18 9"></polyline>
							</svg>
						</button>
					</div>
				</div>

				{#if expandedGroups.has(key)}
					<div class="group-content" style="display: block;">
						<div style="padding: 0;">
							{#each group.items as ref}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div class="referido-item-row" onclick={() => openDetails(ref.id)}>
									<div class="item-info">
										<div class="item-main">
											<span class="item-phone">{formatPhone(ref.numeroReferido)}</span>
											<span class="badge {getItemStatusClass(ref)}">{getItemStatusLabel(ref)}</span>
										</div>
										<div class="item-sub">
											<span>{ref.cedula || 'Sin Cédula'}</span>
											{#if ref.nombre} &bull; <span>{ref.nombre}</span>{/if}
										</div>
									</div>
									<div class="item-actions">
										{#if isPendiente(ref)}
											<button class="btn-reject-sm" onclick={(e) => { e.stopPropagation(); showRejectModal(ref.id); }}>✕ No</button>
											<button class="btn-approve-sm" onclick={(e) => { e.stopPropagation(); showApproveModal(ref.id); }}>✓ Sí</button>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</section>

<!-- Confirm Modal -->
<Modal
	open={modalOpen}
	icon={modalAction?.type === 'aprobar' ? '✓' : '✕'}
	iconType={modalAction?.type === 'aprobar' ? 'aprobar' : 'rechazar'}
	title={modalAction?.type === 'aprobar' ? '¿Aprobar referido?' : '¿Rechazar referido?'}
	description={modalAction?.type === 'aprobar' ? 'Se enviará el QR de acceso al referido automáticamente.' : 'El referido no podrá acceder al evento. Se liberará el slot.'}
	confirmLabel={modalAction?.type === 'aprobar' ? 'Aprobar' : 'Rechazar'}
	confirmClass={modalAction?.type === 'aprobar' ? 'btn-success' : 'btn-danger'}
	loading={modalLoading}
	onconfirm={executeAction}
	oncancel={() => { modalOpen = false; modalAction = null; }}
/>

<!-- Details Modal -->
{#if detailsOpen && selectedReferido}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={(e) => { if (e.target === e.currentTarget) detailsOpen = false; }}>
		<div class="modal-content" style="text-align: left;">
			<div style="text-align: center; margin-bottom: 1rem;">
				<div class="referrer-avatar" style="margin: 0 auto 0.5rem; width: 56px; height: 56px; font-size: 1.25rem;">
					{getInitials(selectedReferido.nombre || selectedReferido.numeroReferido)}
				</div>
				<div style="font-family: monospace; font-weight: 500;">{formatPhone(selectedReferido.numeroReferido)}</div>
				<div style="font-weight: 600; margin-top: 0.25rem;">{selectedReferido.nombre || 'Nombre no registrado'}</div>
				<div style="font-size: 0.8rem; color: var(--text-muted);">CI: {selectedReferido.cedula || 'No registrada'}</div>
			</div>

			<div class="user-details" style="margin-bottom: 1rem;">
				<div class="detail-row">
					<span class="detail-label">Estado:</span>
					<span class="detail-value"><span class="badge {getItemStatusClass(selectedReferido)}">{getItemStatusLabel(selectedReferido)}</span></span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Referido por:</span>
					<span class="detail-value">{selectedReferido.referidoPor || 'Desconocido'}</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Creado:</span>
					<span class="detail-value">{formatDate(selectedReferido.createdAt)}</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Expira:</span>
					<span class="detail-value">{formatDate(selectedReferido.expiraEn)}</span>
				</div>
			</div>

			<div style="display: flex; gap: 0.75rem;">
				{#if isPendiente(selectedReferido)}
					<button class="btn btn-danger" style="flex: 1;" onclick={() => showRejectModal(selectedReferido.id)}>✕ Rechazar</button>
					<button class="btn btn-success" style="flex: 1;" onclick={() => showApproveModal(selectedReferido.id)}>✓ Aprobar Solicitud</button>
				{:else if selectedReferido.aceptacion === 'ACEPTADO'}
					<div style="width: 100%; text-align: center; color: var(--success); font-weight: 600;">✅ Ya aprobado</div>
				{:else if selectedReferido.aceptacion === 'RECHAZADO'}
					<div style="width: 100%; text-align: center; color: var(--danger); font-weight: 600;">❌ Rechazado</div>
				{/if}
			</div>

			<button class="btn btn-secondary" style="width: 100%; margin-top: 0.75rem;" onclick={() => detailsOpen = false}>Cerrar</button>
		</div>
	</div>
{/if}
