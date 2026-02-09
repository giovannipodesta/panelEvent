<script>
	import { onMount } from 'svelte';
	import { toastStore as toast } from '$lib/stores/toast.svelte.js';
	import { getPendingUsers, getApprovedUsers, approveUser, eliminarRegistro, desaprobarUsuario, anularQR, getTokenStats, getUserStats, getEvolutionStats, getProgramados, getHistorial } from '$lib/api/endpoints.js';
	import { getCategoryName, categories } from '$lib/data/categories.js';
	import { formatPhone, formatDate, formatCountdown, debounce } from '$lib/utils/index.js';
	import StatCard from '$lib/components/StatCard.svelte';
	import ExpandableCard from '$lib/components/ExpandableCard.svelte';
	import CiudadanoInfo from '$lib/components/CiudadanoInfo.svelte';

	// Sub-tab state
	let activeSubTab = $state('pending');

	// ==========================================
	// PENDING USERS STATE
	// ==========================================
	let allUsers = $state.raw([]);
	let searchTerm = $state('');
	let categoryFilter = $state('');
	let loadingUsers = $state(true);
	let actionLoading = $state(null);

	let filtered = $derived.by(() => {
		return allUsers.filter(u => {
			const matchCategory = !categoryFilter || u.categoria === categoryFilter;
			const matchSearch = !searchTerm ||
				(u.nombre && u.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
				(u.cedula && u.cedula.includes(searchTerm)) ||
				(u.telefono && u.telefono.includes(searchTerm)) ||
				(u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));
			return matchCategory && matchSearch;
		});
	});

	let categoryCounts = $derived.by(() => {
		const counts = {};
		for (const user of allUsers) {
			if (user.categoria) counts[user.categoria] = (counts[user.categoria] || 0) + 1;
		}
		return counts;
	});

	// ==========================================
	// APPROVED USERS STATE
	// ==========================================
	let allApproved = $state.raw([]);
	let approvedSearch = $state('');
	let approvedCatFilter = $state('');
	let loadingApproved = $state(true);

	let filteredApproved = $derived.by(() => {
		return allApproved.filter(u => {
			const matchCategory = !approvedCatFilter || u.categoria === approvedCatFilter;
			const matchSearch = !approvedSearch ||
				(u.nombre && u.nombre.toLowerCase().includes(approvedSearch.toLowerCase())) ||
				(u.cedula && u.cedula.includes(approvedSearch)) ||
				(u.telefono && u.telefono.includes(approvedSearch)) ||
				(u.email && u.email.toLowerCase().includes(approvedSearch.toLowerCase()));
			return matchCategory && matchSearch;
		});
	});

	let approvedCategoryCounts = $derived.by(() => {
		const counts = {};
		for (const user of allApproved) {
			if (user.categoria) counts[user.categoria] = (counts[user.categoria] || 0) + 1;
		}
		return counts;
	});

	onMount(() => {
		loadPendingUsers();
	});

	async function loadPendingUsers() {
		loadingUsers = true;
		try {
			const data = await getPendingUsers();
			allUsers = data.registros || data.usuarios || [];
		} catch (e) {
			console.error(e);
			toast.show('Error al cargar trabajadores', 'error');
		} finally {
			loadingUsers = false;
		}
	}

	async function loadApprovedUsers() {
		loadingApproved = true;
		try {
			const data = await getApprovedUsers();
			allApproved = data.registros || data.usuarios || [];
		} catch (e) {
			console.error(e);
			toast.show('Error al cargar aprobados', 'error');
		} finally {
			loadingApproved = false;
		}
	}

	async function handleApprove(user) {
		actionLoading = user.id_uuid;
		try {
			await approveUser(user.id_uuid);
			toast.show(`${user.nombre} aprobado`);
			allUsers = allUsers.filter(u => u.id_uuid !== user.id_uuid);
		} catch (e) {
			console.error(e);
			toast.show('Error al aprobar', 'error');
		} finally {
			actionLoading = null;
		}
	}

	async function handleDelete(user) {
		if (!confirm(`¿Eliminar registro de ${user.nombre}? Esta acción es IRREVERSIBLE.`)) return;
		actionLoading = user.id_uuid;
		try {
			await eliminarRegistro(user.id_uuid);
			toast.show(`${user.nombre} eliminado`);
			allUsers = allUsers.filter(u => u.id_uuid !== user.id_uuid);
			allApproved = allApproved.filter(u => u.id_uuid !== user.id_uuid);
		} catch (e) {
			console.error(e);
			toast.show('Error al eliminar', 'error');
		} finally {
			actionLoading = null;
		}
	}

	async function handleDesaprobar(user) {
		if (!confirm(`¿Desaprobar a ${user.nombre}? Volverá a pendientes.`)) return;
		actionLoading = user.id_uuid;
		try {
			await desaprobarUsuario(user.id_uuid);
			toast.show(`${user.nombre} desaprobado`);
			allApproved = allApproved.filter(u => u.id_uuid !== user.id_uuid);
		} catch (e) {
			console.error(e);
			toast.show('Error al desaprobar', 'error');
		} finally {
			actionLoading = null;
		}
	}

	async function handleAnularQR(user) {
		if (!confirm(`¿Anular el QR de ${user.nombre}?`)) return;
		actionLoading = user.id_uuid;
		try {
			await anularQR(user.id_uuid);
			toast.show(`QR de ${user.nombre} anulado`);
			await loadApprovedUsers();
		} catch (e) {
			console.error(e);
			toast.show('Error al anular QR', 'error');
		} finally {
			actionLoading = null;
		}
	}

	const debouncedSearch = debounce((e) => {
		searchTerm = e.target.value.trim();
	}, 300);

	const debouncedApprovedSearch = debounce((e) => {
		approvedSearch = e.target.value.trim();
	}, 300);

	// ==========================================
	// STATISTICS STATE
	// ==========================================
	let statsData = $state({
		totalUsuarios: '-', subtitleUsuarios: 'Cargando...',
		totalMensajes: '-', subtitleMensajes: 'Cargando...',
		tokensDisponibles: '-', subtitleTokens: 'Cargando...',
		conAsistencia: '-', subtitleAsistencia: 'Cargando...',
		lastUpdate: '-'
	});

	let programadosData = $state.raw({ total: 0, envios: [] });
	let historialData = $state.raw({ total: 0, envios: [] });

	// Countdown tick — only runs when stats tab is active
	let tick = $state(0);
	let tickInterval = null;

	function startTick() {
		if (!tickInterval) tickInterval = setInterval(() => tick++, 1000);
	}

	function stopTick() {
		if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
	}

	onMount(() => {
		return () => stopTick();
	});

	async function loadStatistics() {
		statsData.lastUpdate = new Date().toLocaleTimeString('es-EC');
		try {
			await Promise.all([loadUserStats(), loadEvolutionStats(), loadTokenStats(), loadProgramadosData(), loadHistorialData()]);
		} catch (e) {
			console.error('Error loading statistics:', e);
		}
	}

	async function loadUserStats() {
		try {
			const data = await getUserStats();
			const s = data.stats;
			statsData.totalUsuarios = s.total || 0;
			statsData.subtitleUsuarios = `${s.aprobados || 0} aprobados, ${s.pendientes || 0} pendientes`;
			statsData.conAsistencia = s.conAsistencia || 0;
			const pct = s.total > 0 ? Math.round((s.conAsistencia / s.total) * 100) : 0;
			statsData.subtitleAsistencia = `${pct}% del total`;
		} catch (e) {
			statsData.totalUsuarios = 'Error';
			statsData.subtitleUsuarios = 'No disponible';
		}
	}

	async function loadEvolutionStats() {
		try {
			const data = await getEvolutionStats();
			const s = data.stats;
			statsData.totalMensajes = s.mensajesEnviados || 0;
			statsData.subtitleMensajes = `${s.mensajesLeidos || 0} leídos, ${s.mensajesRecibidos || 0} respuestas`;
		} catch (e) {
			statsData.totalMensajes = 'Error';
			statsData.subtitleMensajes = 'No disponible';
		}
	}

	async function loadTokenStats() {
		try {
			const data = await getTokenStats();
			const s = data.stats;
			statsData.tokensDisponibles = s.disponibles || 0;
			statsData.subtitleTokens = `${s.consumidos || 0} consumidos de ${s.total || 0} total`;
		} catch (e) {
			statsData.tokensDisponibles = 'Error';
			statsData.subtitleTokens = 'No disponible';
		}
	}

	async function loadProgramadosData() {
		try {
			programadosData = await getProgramados();
		} catch (e) {
			console.error('Error loading programados:', e);
		}
	}

	async function loadHistorialData() {
		try {
			historialData = await getHistorial();
		} catch (e) {
			console.error('Error loading historial:', e);
		}
	}

	let approvedLoaded = false;

	function switchSubTab(tab) {
		activeSubTab = tab;
		if (tab === 'stats') {
			loadStatistics();
			startTick();
		} else {
			stopTick();
		}
		if (tab === 'approved' && !approvedLoaded) {
			approvedLoaded = true;
			loadApprovedUsers();
		}
	}
</script>

<svelte:head>
	<title>Trabajadores Registrados - Panel de Gestión</title>
</svelte:head>

<!-- Sub-tabs -->
<nav class="sub-tabs">
	<button class="sub-tab" class:active={activeSubTab === 'pending'} onclick={() => switchSubTab('pending')}>
		Pendientes
		{#if allUsers.length > 0}<span class="sub-tab-count">{allUsers.length}</span>{/if}
	</button>
	<button class="sub-tab" class:active={activeSubTab === 'approved'} onclick={() => switchSubTab('approved')}>Ya Aprobados</button>
	<button class="sub-tab" class:active={activeSubTab === 'stats'} onclick={() => switchSubTab('stats')}>Estadísticas</button>
</nav>

<!-- PENDING WORKERS -->
{#if activeSubTab === 'pending'}
	<section>
		<div class="section-header">
			<div>
				<h2>Solicitudes Pendientes</h2>
				<p class="section-desc">Revisa y aprueba las solicitudes de acceso al evento</p>
			</div>
			<button class="btn btn-sm btn-secondary" onclick={loadPendingUsers} disabled={loadingUsers}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 2v6h-6"></path>
					<path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
					<path d="M3 22v-6h6"></path>
					<path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
				</svg>
				Actualizar
			</button>
		</div>

		<input type="text" class="input" placeholder="Buscar por nombre, cédula o teléfono..." oninput={debouncedSearch} style="margin-bottom: 0.75rem;" />

		{#if Object.keys(categoryCounts).length > 0}
			<div class="filter-list" style="margin-bottom: 1rem;">
				<button class="filter-btn" class:active={categoryFilter === ''} onclick={() => { categoryFilter = ''; }}>
					<span>Todos</span>
					<span class="filter-count">{allUsers.length}</span>
				</button>
				{#each Object.entries(categoryCounts) as [catId, count]}
					<button class="filter-btn" class:active={categoryFilter === catId} onclick={() => { categoryFilter = catId; }}>
						<span>{getCategoryName(catId)}</span>
						<span class="filter-count">{count}</span>
					</button>
				{/each}
			</div>
		{/if}

		<p class="results-count">
			<strong>{filtered.length}</strong> solicitud{filtered.length !== 1 ? 'es' : ''} pendiente{filtered.length !== 1 ? 's' : ''}
			{#if filtered.length !== allUsers.length}<span style="opacity: 0.7;">(de {allUsers.length} total)</span>{/if}
		</p>

		{#if loadingUsers}
			<div class="skeleton-card"></div>
			<div class="skeleton-card"></div>
			<div class="skeleton-card"></div>
		{:else if filtered.length === 0}
			<div class="empty-state">
				<div style="font-size: 2.5rem; margin-bottom: 0.75rem;">{searchTerm || categoryFilter ? '🔍' : '🎉'}</div>
				<h3>{searchTerm || categoryFilter ? 'Sin resultados' : '¡Todo al día!'}</h3>
				<p>{searchTerm || categoryFilter ? 'No se encontraron trabajadores con esos filtros.' : 'No hay solicitudes pendientes de aprobación.'}</p>
			</div>
		{:else}
			<div class="worker-card-list">
				{#each filtered as user, i (user.id_uuid ?? `idx-${i}`)}
					<div class="worker-card">
						<div class="worker-card-header">
							<div class="worker-card-avatar">{user.nombre ? user.nombre.split(' ').map(n => n[0]).slice(0, 2).join('') : '?'}</div>
							<div class="worker-card-info">
								<div class="worker-card-name">{user.nombre || 'Sin nombre'}</div>
								<div class="worker-card-detail">
									{#if user.cedula}<span>CI: {user.cedula}</span>{/if}
									{#if user.telefono}<span>{formatPhone(user.telefono)}</span>{/if}
								</div>
								{#if user.email}
									<div class="worker-card-detail">{user.email}</div>
								{/if}
							</div>
							<span class="badge badge-info">{getCategoryName(user.categoria)}</span>
						</div>
						{#if user.cedula}
							<CiudadanoInfo cedula={user.cedula} />
						{/if}
						<div class="worker-card-actions">
							<button
								class="btn btn-danger-outline"
								onclick={() => handleDelete(user)}
								disabled={!user.id_uuid || actionLoading === user.id_uuid}
							>
								{#if actionLoading === user.id_uuid}
									<span class="loader"></span>
								{:else}
									✕ Eliminar
								{/if}
							</button>
							<button
								class="btn btn-success"
								onclick={() => handleApprove(user)}
								disabled={!user.id_uuid || actionLoading === user.id_uuid}
							>
								{#if actionLoading === user.id_uuid}
									<span class="loader"></span>
								{:else}
									✓ Aprobar
								{/if}
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<!-- APPROVED WORKERS -->
{#if activeSubTab === 'approved'}
	<section>
		<div class="section-header">
			<div>
				<h2>Trabajadores Aprobados</h2>
				<p class="section-desc">Personas ya aprobadas con acceso al evento</p>
			</div>
			<button class="btn btn-sm btn-secondary" onclick={loadApprovedUsers} disabled={loadingApproved}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 2v6h-6"></path>
					<path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
					<path d="M3 22v-6h6"></path>
					<path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
				</svg>
				Actualizar
			</button>
		</div>

		<input type="text" class="input" placeholder="Buscar por nombre, cédula o teléfono..." oninput={debouncedApprovedSearch} style="margin-bottom: 0.75rem;" />

		{#if Object.keys(approvedCategoryCounts).length > 0}
			<div class="filter-list" style="margin-bottom: 1rem;">
				<button class="filter-btn" class:active={approvedCatFilter === ''} onclick={() => { approvedCatFilter = ''; }}>
					<span>Todos</span>
					<span class="filter-count">{allApproved.length}</span>
				</button>
				{#each Object.entries(approvedCategoryCounts) as [catId, count]}
					<button class="filter-btn" class:active={approvedCatFilter === catId} onclick={() => { approvedCatFilter = catId; }}>
						<span>{getCategoryName(catId)}</span>
						<span class="filter-count">{count}</span>
					</button>
				{/each}
			</div>
		{/if}

		<p class="results-count">
			<strong>{filteredApproved.length}</strong> trabajador{filteredApproved.length !== 1 ? 'es' : ''} aprobado{filteredApproved.length !== 1 ? 's' : ''}
			{#if filteredApproved.length !== allApproved.length}<span style="opacity: 0.7;">(de {allApproved.length} total)</span>{/if}
		</p>

		{#if loadingApproved}
			<div class="skeleton-card"></div>
			<div class="skeleton-card"></div>
			<div class="skeleton-card"></div>
		{:else if filteredApproved.length === 0}
			<div class="empty-state">
				<div style="font-size: 2.5rem; margin-bottom: 0.75rem;">{approvedSearch || approvedCatFilter ? '🔍' : '📋'}</div>
				<h3>{approvedSearch || approvedCatFilter ? 'Sin resultados' : 'Sin aprobados'}</h3>
				<p>{approvedSearch || approvedCatFilter ? 'No se encontraron trabajadores con esos filtros.' : 'No hay trabajadores aprobados aún.'}</p>
			</div>
		{:else}
			<div class="worker-card-list">
				{#each filteredApproved as user, i (user.id_uuid ?? `ap-${i}`)}
					<div class="worker-card" style="border-left-color: var(--success);">
						<div class="worker-card-header">
							<div class="worker-card-avatar" style="background: linear-gradient(135deg, var(--success), #059669);">{user.nombre ? user.nombre.split(' ').map(n => n[0]).slice(0, 2).join('') : '?'}</div>
							<div class="worker-card-info">
								<div class="worker-card-name">{user.nombre || 'Sin nombre'}</div>
								<div class="worker-card-detail">
									{#if user.cedula}<span>CI: {user.cedula}</span>{/if}
									{#if user.telefono}<span>{formatPhone(user.telefono)}</span>{/if}
								</div>
								{#if user.email}
									<div class="worker-card-detail">{user.email}</div>
								{/if}
							</div>
							<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem;">
								<span class="badge badge-success">Aprobado</span>
								<span class="badge badge-info">{getCategoryName(user.categoria)}</span>
							</div>
						</div>
						{#if user.cedula}
							<CiudadanoInfo cedula={user.cedula} />
						{/if}
						<div class="worker-card-actions">
							<button
								class="btn btn-sm btn-danger-outline"
								onclick={() => handleAnularQR(user)}
								disabled={!user.id_uuid || actionLoading === user.id_uuid}
							>
								Anular QR
							</button>
							<button
								class="btn btn-sm btn-danger-outline"
								onclick={() => handleDesaprobar(user)}
								disabled={!user.id_uuid || actionLoading === user.id_uuid}
							>
								Desaprobar
							</button>
							<button
								class="btn btn-sm btn-danger-outline"
								onclick={() => handleDelete(user)}
								disabled={!user.id_uuid || actionLoading === user.id_uuid}
							>
								{#if actionLoading === user.id_uuid}
									<span class="loader"></span>
								{:else}
									Eliminar
								{/if}
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<!-- STATISTICS -->
{#if activeSubTab === 'stats'}
	<section>
		<div class="section-header">
			<h2>Estadísticas del Evento</h2>
			<p class="section-desc">Última actualización: {statsData.lastUpdate}</p>
		</div>

		<div class="stats-grid">
			<StatCard icon="👥" label="Usuarios Registrados" value={statsData.totalUsuarios} subtitle={statsData.subtitleUsuarios} />
			<StatCard icon="📤" label="Mensajes Enviados" value={statsData.totalMensajes} subtitle={statsData.subtitleMensajes} />
			<StatCard icon="🎟️" label="Tokens Disponibles" value={statsData.tokensDisponibles} subtitle={statsData.subtitleTokens} />
			<StatCard icon="✓" label="Asistencia Confirmada" value={statsData.conAsistencia} subtitle={statsData.subtitleAsistencia} />
		</div>

		<!-- Mensajes Programados -->
		<ExpandableCard title="Mensajes Programados" icon="⏱️" count={programadosData.total || 0} onrefresh={loadProgramadosData}>
			{#if !programadosData.envios || programadosData.envios.length === 0}
				<div class="card-empty-state">
					<div class="icon">⏳</div>
					<p>No hay mensajes programados pendientes</p>
				</div>
			{:else}
				{#each programadosData.envios as e}
					<div class="message-item">
						<div class="message-item-left">
							<span class="message-phone">{formatPhone(e.telefono)}</span>
							<span class="message-time">{e.horaEcuador}</span>
						</div>
						<div class="message-item-right">
							<span class="countdown-timer" class:sending={e.timestampEnvio - Date.now() <= 0}>
								{void tick, formatCountdown(e.timestampEnvio)}
							</span>
							<span class="badge badge-info" style="font-size: 0.7rem;">{e.estado}</span>
						</div>
					</div>
				{/each}
			{/if}
		</ExpandableCard>

		<!-- Historial de Envíos -->
		<ExpandableCard title="Historial de Envíos" icon="📜" count={historialData.total || 0} onrefresh={loadHistorialData}>
			{#if !historialData.envios || historialData.envios.length === 0}
				<div class="card-empty-state">
					<div class="icon">📜</div>
					<p>No hay historial</p>
				</div>
			{:else}
				{#each historialData.envios.slice(0, 15) as e}
					<div class="message-item">
						<div class="message-item-left">
							<span class="message-phone">{formatPhone(e.telefono)}</span>
							<span class="message-time">{e.horaEcuador}</span>
						</div>
						<div class="message-item-right">
							<span class="badge badge-info" style="font-size: 0.7rem;">{e.estado}</span>
						</div>
					</div>
				{/each}
			{/if}
		</ExpandableCard>
	</section>
{/if}
