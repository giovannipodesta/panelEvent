<script>
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { toastStore as toast } from '$lib/stores/toast.svelte.js';
	import { guestStore } from '$lib/stores/guests.svelte.js';
	import { getTokenStats, processBulkInvitations, getInvitadosEspeciales, updateMaxReferidos, revocarInvitacion, eliminarRegistro, anularQR, getInvitadoDetalle } from '$lib/api/endpoints.js';
	import { cleanPhoneNumber, formatPhone, formatDate, debounce } from '$lib/utils/index.js';
	import StatCard from '$lib/components/StatCard.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import ContactFileImporter from '$lib/components/ContactFileImporter.svelte';

	// Sub-tab state
	let activeSubTab = $state('invite');

	// ==========================================
	// INVITE TAB STATE
	// ==========================================
	let stats = $state({ total: '...', habilitados: '...', consumidos: '...', aceptados: 0, rechazados: 0, sinRespuesta: 0 });
	let phoneInput = $state('');
	let bulkInput = $state('');
	let showBulkInput = $state(false);
	let processing = $state(false);
	let processResult = $state(null);
	let contactPickerSupported = $state(false);

	// ==========================================
	// INVITADOS LIST TAB STATE
	// ==========================================
	let allInvitados = $state.raw([]);
	let invSearchTerm = $state('');
	let filterEstado = $state('');
	let filterAceptacion = $state('');
	let currentPage = $state(1);
	let loadingInvitados = $state(true);
	let expandedRows = $state(new Set());
	let detailModal = $state(false);
	let detailData = $state(null);
	let detailLoading = $state(false);
	let invActionLoading = $state(null);
	const itemsPerPage = 20;

	let filteredInv = $derived.by(() => {
		return allInvitados.filter(inv => {
			const matchSearch = !invSearchTerm ||
				(inv.telefono && inv.telefono.includes(invSearchTerm)) ||
				(inv.cedula && inv.cedula.includes(invSearchTerm)) ||
				(inv.nombre && inv.nombre.toLowerCase().includes(invSearchTerm.toLowerCase()));
			const matchEstado = !filterEstado || inv.estado === filterEstado;
			let matchAceptacion = true;
			if (filterAceptacion) {
				matchAceptacion = filterAceptacion === 'null' ? inv.aceptacion === null : inv.aceptacion === filterAceptacion;
			}
			return matchSearch && matchEstado && matchAceptacion;
		});
	});

	let invStatTotal = $derived(allInvitados.length);
	let invStatHabilitados = $derived(allInvitados.filter(i => i.estado === 'habilitado').length);
	let invStatConsumidos = $derived(allInvitados.filter(i => i.estado === 'consumido').length);
	let invStatConReferidos = $derived(allInvitados.filter(i => i.maxReferidos > 0).length);

	let totalPages = $derived(Math.ceil(filteredInv.length / itemsPerPage));
	let pageItems = $derived.by(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredInv.slice(start, start + itemsPerPage);
	});

	onMount(() => {
		loadStats();
		contactPickerSupported = 'contacts' in navigator && 'ContactsManager' in window;
	});

	// ==========================================
	// INVITE TAB FUNCTIONS
	// ==========================================

	async function loadStats() {
		try {
			const data = await getTokenStats();
			const s = data.stats || data;
			stats = {
				total: s.total ?? 'N/A',
				habilitados: s.habilitados ?? 'N/A',
				consumidos: s.consumidos ?? 'N/A',
				aceptados: s.aceptacion?.aceptados ?? 0,
				rechazados: s.aceptacion?.rechazados ?? 0,
				sinRespuesta: s.aceptacion?.sinRespuesta ?? 0
			};
		} catch (e) {
			console.error('Error loading stats:', e);
			stats.total = 'Err';
			stats.habilitados = 'Err';
		}
	}

	function addGuest() {
		const number = phoneInput.trim();
		if (!/^\d{10}$/.test(number)) {
			toast.show('El número debe tener 10 dígitos', 'error');
			return;
		}
		if (!guestStore.add(number, guestStore.maxReferidos)) {
			toast.show('Este número ya está en la lista', 'warning');
			return;
		}
		phoneInput = '';
		toast.show('Número agregado');
	}

	function handleInputKeypress(e) {
		if (e.key === 'Enter') addGuest();
	}

	function handleInputChange() {
		if (phoneInput.length > 10) phoneInput = phoneInput.slice(0, 10);
	}

	function removeGuest(number) {
		guestStore.remove(number);
		toast.show('Número eliminado');
	}

	function importBulkNumbers() {
		const text = bulkInput.trim();
		if (!text) {
			toast.show('Pega números separados por coma, línea o espacio', 'warning');
			return;
		}
		const rawNumbers = text.split(/[\s,;\n\r\t|]+/).map(s => s.trim()).filter(Boolean);
		const validNumbers = [];
		for (const raw of rawNumbers) {
			const clean = cleanPhoneNumber(raw);
			if (clean) validNumbers.push(clean);
		}
		if (validNumbers.length === 0) {
			toast.show('No se encontraron números válidos de 10 dígitos', 'error');
			return;
		}
		const added = guestStore.addMultiple(validNumbers, guestStore.maxReferidos);
		const skipped = validNumbers.length - added;
		toast.show(`${added} número(s) agregado(s)${skipped > 0 ? `, ${skipped} duplicado(s)` : ''}`);
		bulkInput = '';
		showBulkInput = false;
	}

	function handleFileImport(phones) {
		if (phones.length > 0) {
			const added = guestStore.addMultiple(phones, guestStore.maxReferidos);
			const skipped = phones.length - added;
			toast.show(`${added} número(s) importado(s)${skipped > 0 ? `, ${skipped} duplicado(s)` : ''}`);
		} else {
			toast.show('No se encontraron números válidos', 'warning');
		}
	}

	async function selectContacts() {
		if (!contactPickerSupported) return;
		try {
			const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
			if (contacts.length === 0) return;
			const numbers = [];
			for (const contact of contacts) {
				if (contact.tel) {
					for (const phone of contact.tel) {
						const clean = cleanPhoneNumber(phone);
						if (clean) numbers.push(clean);
					}
				}
			}
			if (numbers.length > 0) {
				const added = guestStore.addMultiple(numbers, guestStore.maxReferidos);
				toast.show(`${added} número(s) importado(s) de contactos`);
			} else {
				toast.show('No se encontraron números válidos', 'warning');
			}
		} catch (err) {
			if (err.name === 'AbortError') return;
			console.error('Contact Picker Error:', err);
			toast.show('Error al acceder a contactos', 'error');
		}
	}

	async function processList() {
		if (guestStore.count === 0) {
			toast.show('La lista está vacía', 'warning');
			return;
		}
		processing = true;
		processResult = null;
		try {
			const invitados = guestStore.list.map(g => ({ numero: g.numero, maxReferidos: g.maxReferidos }));
			await processBulkInvitations(invitados);
			const totalReferidos = guestStore.list.reduce((sum, g) => sum + g.maxReferidos, 0);
			const avg = guestStore.count > 0 ? (totalReferidos / guestStore.count).toFixed(1) : 0;
			processResult = {
				count: guestStore.count,
				totalReferidos,
				avg
			};
			toast.show('Invitaciones enviadas con éxito');
			guestStore.clear();
			loadStats();
		} catch (e) {
			console.error(e);
			toast.show('Error al procesar la lista', 'error');
		} finally {
			processing = false;
		}
	}

	// ==========================================
	// INVITADOS LIST TAB FUNCTIONS
	// ==========================================

	let invitadosLoaded = false;

	function switchSubTab(tab) {
		activeSubTab = tab;
		if (tab === 'list' && !invitadosLoaded) {
			invitadosLoaded = true;
			loadInvitados();
		}
	}

	async function loadInvitados() {
		loadingInvitados = true;
		try {
			const data = await getInvitadosEspeciales();
			allInvitados = data.invitados || [];
		} catch (e) {
			console.error(e);
			toast.show('Error al cargar los invitados', 'error');
		} finally {
			loadingInvitados = false;
		}
	}

	const debouncedInvSearch = debounce((e) => {
		invSearchTerm = e.target.value.trim();
		currentPage = 1;
	}, 300);

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
		invActionLoading = tokenId;
		try {
			await revocarInvitacion(tokenId);
			toast.show('Invitación revocada');
			allInvitados = allInvitados.map(i =>
				i.tokenId === tokenId ? { ...i, estado: 'consumido', aceptacion: 'RECHAZADO' } : i
			);
		} catch (e) {
			toast.show(e.message || 'Error al revocar', 'error');
		} finally {
			invActionLoading = null;
		}
	}

	async function handleAnularQRInv(inv) {
		if (!inv.usuario?.id_uuid) { toast.show('Sin registro de usuario', 'error'); return; }
		if (!confirm('¿Anular el QR de este usuario?')) return;
		invActionLoading = inv.tokenId;
		try {
			await anularQR(inv.usuario.id_uuid);
			toast.show('QR anulado');
			await loadInvitados();
		} catch (e) {
			toast.show(e.message || 'Error al anular QR', 'error');
		} finally {
			invActionLoading = null;
		}
	}

	async function handleEliminarInv(inv) {
		if (!inv.usuario?.id_uuid) { toast.show('Sin registro de usuario', 'error'); return; }
		if (!confirm('¿Eliminar registro completo? IRREVERSIBLE.')) return;
		invActionLoading = inv.tokenId;
		try {
			await eliminarRegistro(inv.usuario.id_uuid);
			toast.show('Registro eliminado');
			allInvitados = allInvitados.filter(i => i.tokenId !== inv.tokenId);
		} catch (e) {
			toast.show(e.message || 'Error al eliminar', 'error');
		} finally {
			invActionLoading = null;
		}
	}

	function getPaginationPages() {
		const pages = [];
		const maxVisible = 5;
		let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
		let end = Math.min(totalPages, start + maxVisible - 1);
		if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
		for (let i = start; i <= end; i++) pages.push(i);
		return pages;
	}
</script>

<svelte:head>
	<title>Invitados VIP - Panel de Gestión</title>
</svelte:head>

<!-- Sub-tabs -->
<nav class="sub-tabs">
	<button class="sub-tab" class:active={activeSubTab === 'invite'} onclick={() => switchSubTab('invite')}>Enviar Invitaciones</button>
	<button class="sub-tab" class:active={activeSubTab === 'list'} onclick={() => switchSubTab('list')}>
		Lista de Invitados
		{#if invStatTotal > 0}<span class="sub-tab-count">{invStatTotal}</span>{/if}
	</button>
</nav>

<!-- ==================== INVITE TAB ==================== -->
{#if activeSubTab === 'invite'}
<section class="card">
	<div class="section-header">
		<div>
			<h2>Enviar Invitaciones VIP</h2>
			<p class="section-desc">Agrega números de teléfono y envía invitaciones al evento</p>
		</div>
	</div>

	<!-- Stats -->
	<div class="stats-grid">
		<StatCard icon="📊" label="Total" value={stats.total} subtitle="Tokens generados" />
		<StatCard icon="✅" label="Habilitados" value={stats.habilitados} subtitle="Listos para usar" />
		<StatCard icon="🎟️" label="Consumidos" value={stats.consumidos} subtitle="Ya utilizados" />
		<StatCard icon="📬" label="Aceptación" value={stats.aceptados}
			subtitle='<span style="color: var(--danger)">✖ {stats.rechazados}</span> | <span style="color: var(--text-muted)">? {stats.sinRespuesta}</span>' />
	</div>

	<!-- Registration Form -->
	<div class="registration-section">
		<h3 class="section-title-small">Nuevo Registro</h3>

		<div style="margin-bottom: 1rem;">
			<label for="guestInput" style="font-size: 0.9rem; color: var(--text-secondary); display: block; margin-bottom: 0.5rem;">
				Agregar Número de Teléfono
			</label>
			<div class="input-group">
				<input
					type="number"
					id="guestInput"
					class="input"
					placeholder="099xxxxxxx (10 dígitos)"
					bind:value={phoneInput}
					oninput={handleInputChange}
					onkeypress={handleInputKeypress}
				/>
				<button class="btn-icon" onclick={addGuest} title="Agregar">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="12" y1="5" x2="12" y2="19"></line>
						<line x1="5" y1="12" x2="19" y2="12"></line>
					</svg>
				</button>
			</div>
		</div>

		<!-- Import Options -->
		<div class="contact-picker-wrapper">
			<div class="divider"><span>o importar desde</span></div>
			<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
				<ContactFileImporter onimport={handleFileImport} />
				<button class="contact-btn" style="flex: 1;" onclick={() => showBulkInput = !showBulkInput}>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
						<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
						<rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
					</svg>
					<span>Pegar Lista</span>
				</button>
				{#if contactPickerSupported}
					<button class="contact-btn" style="flex: 1;" onclick={selectContacts}>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
							<circle cx="9" cy="7" r="4"></circle>
							<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
							<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
						</svg>
						<span>Contactos</span>
					</button>
				{/if}
			</div>
			{#if showBulkInput}
				<div style="margin-top: 0.75rem;">
					<textarea
						class="input"
						bind:value={bulkInput}
						placeholder="Pega números separados por coma, espacio o línea&#10;Ej: 0991234567, 0987654321&#10;o uno por línea"
						rows="4"
						style="resize: vertical; font-family: monospace; font-size: 0.85rem;"
					></textarea>
					<button class="btn btn-primary btn-sm" style="margin-top: 0.5rem; width: 100%;" onclick={importBulkNumbers}>
						Importar Números
					</button>
				</div>
			{/if}
		</div>

		<!-- Guest List -->
		<div style="margin-bottom: 1rem;">
			<label style="font-size: 0.9rem; color: var(--text-secondary); display: block; margin-bottom: 0.5rem;">
				Invitados en Lista (<span>{guestStore.count}</span>)
			</label>
			<div class="guest-list-container">
				{#if guestStore.list.length === 0}
					<div class="empty-list-msg">No hay números agregados</div>
				{:else}
					{#each guestStore.list as guest, i (guest.numero ?? `g-${i}`)}
						<div class="guest-item">
							<div class="guest-info">
								<span class="guest-number">{guest.numero}</span>
								<div class="guest-referidos-control">
									<button
										class="mini-control-btn"
										disabled={guest.maxReferidos <= 0}
										onclick={() => guestStore.updateGuestMaxRef(guest.numero, -1)}
									>−</button>
									<span class="mini-referidos-value">{guest.maxReferidos}</span>
									<button
										class="mini-control-btn"
										disabled={guest.maxReferidos >= 10}
										onclick={() => guestStore.updateGuestMaxRef(guest.numero, 1)}
									>+</button>
									<span class="referidos-label">ref</span>
								</div>
							</div>
							<button class="btn-icon" onclick={() => removeGuest(guest.numero)} title="Eliminar">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="3 6 5 6 21 6"></polyline>
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
									<line x1="10" y1="11" x2="10" y2="17"></line>
									<line x1="14" y1="11" x2="14" y2="17"></line>
								</svg>
							</button>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Config + Process -->
		<div class="config-row">
			<div class="config-item">
				<span class="config-label">Referidos por defecto</span>
				<div class="referidos-stepper">
					<button class="stepper-btn" onclick={() => guestStore.decrementMaxRef()} style:opacity={guestStore.maxReferidos <= 0 ? 0.3 : 1} style:cursor={guestStore.maxReferidos <= 0 ? 'not-allowed' : 'pointer'}>−</button>
					<span class="stepper-value">{guestStore.maxReferidos}</span>
					<button class="stepper-btn" onclick={() => guestStore.incrementMaxRef()} style:opacity={guestStore.maxReferidos >= 10 ? 0.3 : 1} style:cursor={guestStore.maxReferidos >= 10 ? 'not-allowed' : 'pointer'}>+</button>
				</div>
				<span class="config-hint">Cada invitado puede ajustarse individualmente</span>
			</div>

			<button class="btn btn-primary" onclick={processList} disabled={processing}>
				{#if processing}
					<span class="loader"></span>
				{:else}
					Procesar Lista
				{/if}
			</button>
		</div>

		{#if processResult}
			<div class="card" style="margin-top: 1rem; background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3);">
				<h4 style="margin-bottom: 0.5rem; color: var(--success);">Lista Procesada</h4>
				<p>Se han enviado <strong>{processResult.count}</strong> invitaciones.</p>
				<p style="font-size: 0.85rem; color: var(--text-muted);">
					Total acompañantes permitidos: <strong>{processResult.totalReferidos}</strong>
					(promedio: {processResult.avg} por invitado)
				</p>
			</div>
		{/if}
	</div>
</section>
{/if}

<!-- ==================== INVITADOS LIST TAB ==================== -->
{#if activeSubTab === 'list'}
<section>
	<div class="section-header">
		<div>
			<h2>Invitados Enviados</h2>
			<p class="section-desc">Todas las invitaciones VIP procesadas</p>
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
		<StatCard icon="📊" label="Total" value={invStatTotal} />
		<StatCard icon="✅" label="Habilitados" value={invStatHabilitados} />
		<StatCard icon="🎟️" label="Consumidos" value={invStatConsumidos} />
		<StatCard icon="👥" label="Con Referidos" value={invStatConReferidos} />
	</div>

	<!-- Search -->
	<input type="text" class="input" placeholder="Buscar por teléfono, cédula o nombre..." oninput={debouncedInvSearch} style="margin-bottom: 0.75rem;" />

	<!-- Filters -->
	<div class="status-tabs" style="margin-bottom: 1rem;">
		<button class="status-tab" class:active={filterEstado === '' && filterAceptacion === ''} onclick={() => { filterEstado = ''; filterAceptacion = ''; currentPage = 1; }}>
			Todos
			<span class="tab-count">{allInvitados.length}</span>
		</button>
		<button class="status-tab" class:active={filterEstado === 'habilitado'} onclick={() => { filterEstado = 'habilitado'; filterAceptacion = ''; currentPage = 1; }}>
			Habilitados
			<span class="tab-count">{invStatHabilitados}</span>
		</button>
		<button class="status-tab" class:active={filterEstado === 'consumido'} onclick={() => { filterEstado = 'consumido'; filterAceptacion = ''; currentPage = 1; }}>
			Consumidos
			<span class="tab-count">{invStatConsumidos}</span>
		</button>
		<button class="status-tab" class:active={filterAceptacion === 'ACEPTADO'} onclick={() => { filterAceptacion = 'ACEPTADO'; filterEstado = ''; currentPage = 1; }}>
			Aceptados
		</button>
	</div>

	<!-- Results count -->
	<p class="results-count">
		Mostrando <strong>{pageItems.length}</strong> de <strong>{filteredInv.length}</strong> invitados
		{#if filteredInv.length !== allInvitados.length}<span style="opacity: 0.7;">({allInvitados.length} total)</span>{/if}
	</p>

	<!-- Card List -->
	{#if loadingInvitados}
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

					<div class="invitado-card-actions">
						<button class="btn btn-sm btn-secondary" onclick={() => openDetail(inv.telefono)} disabled={invActionLoading === inv.tokenId}>
							Ver Detalle
						</button>
						{#if inv.estado === 'habilitado'}
							<button class="btn btn-sm btn-danger-outline" onclick={() => handleRevocar(inv.tokenId)} disabled={invActionLoading === inv.tokenId}>
								Revocar
							</button>
						{/if}
						{#if inv.qrEnviado && inv.usuario?.id_uuid}
							<button class="btn btn-sm btn-danger-outline" onclick={() => handleAnularQRInv(inv)} disabled={invActionLoading === inv.tokenId}>
								Anular QR
							</button>
						{/if}
						{#if inv.usuario?.id_uuid}
							<button class="btn btn-sm btn-danger-outline" onclick={() => handleEliminarInv(inv)} disabled={invActionLoading === inv.tokenId}>
								Eliminar
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>

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
						<span>{detailData.usuario.aprobado ? 'Sí' : 'No'}</span>
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
						<div style="display: flex; gap: 0.5rem; align-items: center; padding: 0.25rem 0; font-size: 0.85rem;">
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
						<div style="font-size: 0.85rem; padding: 0.25rem 0;">
							{envio.tipo || 'Envío'} — {envio.estado || '-'}
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</Modal>
{/if}
{/if}

<style>
	.invitado-card-list { display: flex; flex-direction: column; gap: 0.75rem; }
	.invitado-card {
		background: var(--bg-card); border: 1px solid var(--border-color);
		border-radius: var(--radius-lg); padding: 1rem 1.25rem; border-left: 3px solid var(--text-muted);
	}
	.invitado-card.status-habilitado { border-left-color: var(--success); }
	.invitado-card.status-consumido { border-left-color: var(--accent-purple); }
	.invitado-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.75rem; }
	.invitado-card-main { flex: 1; min-width: 0; }
	.invitado-card-phone { font-family: monospace; font-weight: 600; font-size: 1.05rem; }
	.invitado-card-name { font-weight: 500; font-size: 0.95rem; margin-top: 0.15rem; }
	.invitado-card-sub { font-size: 0.85rem; color: var(--text-muted); }
	.invitado-card-badges { display: flex; flex-direction: column; gap: 0.35rem; align-items: flex-end; }
	.invitado-card-info-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 0.75rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color); }
	.invitado-card-ref { display: flex; align-items: center; gap: 0.5rem; }
	.invitado-card-ref-label { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }
	.invitado-card-date { font-size: 0.85rem; color: var(--text-secondary); text-align: right; }
	.invitado-expand-btn { display: flex; align-items: center; gap: 0.5rem; width: 100%; padding: 0.5rem 0; background: none; border: none; border-top: 1px solid var(--border-color); color: var(--accent-purple); font-family: inherit; font-size: 0.85rem; font-weight: 500; cursor: pointer; }
	.invitado-referidos-list { padding: 0.5rem 0; }
	.invitado-ref-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0; font-size: 0.85rem; }
	.invitado-card-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); }
	.invitado-card-actions .btn { flex: 1; min-width: max-content; justify-content: center; }
	.detail-section { margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
	.detail-section h4 { margin: 0 0 0.5rem; font-size: 0.9rem; color: var(--text-muted); letter-spacing: 0.05em; }
	.detail-grid { display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 0.75rem; font-size: 0.95rem; }
	.detail-label { color: var(--text-muted); font-size: 0.85rem; }
</style>
