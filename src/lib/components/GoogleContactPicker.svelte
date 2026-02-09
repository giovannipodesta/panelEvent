<script>
	import { onMount } from 'svelte';
	import { PUBLIC_GOOGLE_CLIENT_ID, PUBLIC_GOOGLE_API_KEY } from '$env/static/public';

	let { onselect, disabled = false } = $props();

	const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/people/v1/rest';
	const SCOPES = 'https://www.googleapis.com/auth/contacts.readonly';

	// State
	let gapiReady = $state(false);
	let gisReady = $state(false);
	let loading = $state(false);
	let showModal = $state(false);
	let contacts = $state.raw([]);
	let selected = $state(new Set());
	let searchTerm = $state('');
	let tokenClient = $state(null);
	let errorMsg = $state('');

	let ready = $derived(gapiReady && gisReady && !!PUBLIC_GOOGLE_CLIENT_ID);

	let filteredContacts = $derived.by(() => {
		if (!searchTerm) return contacts;
		const q = searchTerm.toLowerCase();
		return contacts.filter(c =>
			c.name.toLowerCase().includes(q) ||
			c.phones.some(p => p.includes(q))
		);
	});

	let selectedCount = $derived(selected.size);

	onMount(() => {
		if (!PUBLIC_GOOGLE_CLIENT_ID || !PUBLIC_GOOGLE_API_KEY) return;
		loadGapiScript();
		loadGisScript();
	});

	function loadGapiScript() {
		if (window.gapi) {
			initGapi();
			return;
		}
		const script = document.createElement('script');
		script.src = 'https://apis.google.com/js/api.js';
		script.onload = initGapi;
		document.head.appendChild(script);
	}

	function loadGisScript() {
		if (window.google?.accounts?.oauth2) {
			initGis();
			return;
		}
		const script = document.createElement('script');
		script.src = 'https://accounts.google.com/gsi/client';
		script.onload = initGis;
		document.head.appendChild(script);
	}

	function initGapi() {
		gapi.load('client', async () => {
			await gapi.client.init({
				apiKey: PUBLIC_GOOGLE_API_KEY,
				discoveryDocs: [DISCOVERY_DOC],
			});
			gapiReady = true;
		});
	}

	function initGis() {
		tokenClient = google.accounts.oauth2.initTokenClient({
			client_id: PUBLIC_GOOGLE_CLIENT_ID,
			scope: SCOPES,
			callback: '',
		});
		gisReady = true;
	}

	function handleClick() {
		if (!ready || loading) return;
		loading = true;
		errorMsg = '';

		tokenClient.callback = async (resp) => {
			if (resp.error) {
				loading = false;
				errorMsg = 'Error de autenticación';
				return;
			}
			await fetchContacts();
		};

		if (gapi.client.getToken() === null) {
			tokenClient.requestAccessToken({ prompt: 'consent' });
		} else {
			tokenClient.requestAccessToken({ prompt: '' });
		}
	}

	async function fetchContacts() {
		try {
			let allContacts = [];
			let nextPageToken = undefined;

			// Fetch up to 500 contacts with phone numbers
			do {
				const response = await gapi.client.people.people.connections.list({
					resourceName: 'people/me',
					pageSize: 100,
					personFields: 'names,phoneNumbers',
					sortOrder: 'FIRST_NAME_ASCENDING',
					pageToken: nextPageToken,
				});

				const connections = response.result.connections || [];
				for (const person of connections) {
					const phones = (person.phoneNumbers || [])
						.map(p => p.value?.replace(/[\s\-\(\)\.]/g, ''))
						.filter(Boolean);

					if (phones.length === 0) continue;

					const name = person.names?.[0]?.displayName || 'Sin nombre';
					allContacts.push({ name, phones, resourceName: person.resourceName });
				}

				nextPageToken = response.result.nextPageToken;
			} while (nextPageToken && allContacts.length < 500);

			contacts = allContacts;
			selected = new Set();
			searchTerm = '';
			showModal = true;
		} catch (err) {
			console.error('Error fetching contacts:', err);
			errorMsg = 'Error al cargar contactos';
		} finally {
			loading = false;
		}
	}

	function toggleContact(idx) {
		const next = new Set(selected);
		if (next.has(idx)) next.delete(idx);
		else next.add(idx);
		selected = next;
	}

	function toggleAll() {
		if (selected.size === filteredContacts.length) {
			selected = new Set();
		} else {
			selected = new Set(filteredContacts.map((_, i) => {
				// Map filtered index back to contacts index
				return contacts.indexOf(filteredContacts[i]);
			}));
		}
	}

	function confirmSelection() {
		const phones = [];
		for (const idx of selected) {
			for (const phone of contacts[idx].phones) {
				// Clean to 10-digit Ecuador format
				let clean = phone.replace(/\D/g, '');
				if (clean.startsWith('593')) clean = '0' + clean.slice(3);
				if (clean.startsWith('+593')) clean = '0' + clean.slice(4);
				if (/^0\d{9}$/.test(clean)) {
					phones.push(clean);
				}
			}
		}
		showModal = false;
		if (onselect && phones.length > 0) {
			onselect(phones);
		}
	}

	function closeModal() {
		showModal = false;
		searchTerm = '';
	}
</script>

{#if PUBLIC_GOOGLE_CLIENT_ID}
	<button
		class="contact-btn google-btn"
		style="flex: 1;"
		onclick={handleClick}
		disabled={!ready || loading || disabled}
	>
		{#if loading}
			<span class="loader-sm"></span>
			<span>Cargando...</span>
		{:else}
			<svg width="18" height="18" viewBox="0 0 24 24">
				<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
				<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
				<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
				<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
			</svg>
			<span>Google Contacts</span>
		{/if}
	</button>
{/if}

{#if errorMsg}
	<div style="font-size: 0.75rem; color: var(--danger); margin-top: 0.25rem;">{errorMsg}</div>
{/if}

<!-- Contact Selection Modal -->
{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="gcp-overlay" onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
		<div class="gcp-modal">
			<div class="gcp-header">
				<h3>Seleccionar Contactos</h3>
				<button class="gcp-close" onclick={closeModal}>&times;</button>
			</div>

			<div class="gcp-search">
				<input
					type="text"
					class="input"
					placeholder="Buscar contacto..."
					bind:value={searchTerm}
				/>
			</div>

			<div class="gcp-actions-bar">
				<button class="gcp-select-all" onclick={toggleAll}>
					{selected.size === filteredContacts.length && filteredContacts.length > 0 ? 'Deseleccionar todo' : 'Seleccionar todo'}
				</button>
				<span class="gcp-count">{contacts.length} contactos con teléfono</span>
			</div>

			<div class="gcp-list">
				{#if filteredContacts.length === 0}
					<div class="gcp-empty">No se encontraron contactos</div>
				{:else}
					{#each filteredContacts as contact, i}
						{@const realIdx = contacts.indexOf(contact)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="gcp-item"
							class:selected={selected.has(realIdx)}
							onclick={() => toggleContact(realIdx)}
						>
							<div class="gcp-check" class:checked={selected.has(realIdx)}>
								{#if selected.has(realIdx)}✓{/if}
							</div>
							<div class="gcp-info">
								<div class="gcp-name">{contact.name}</div>
								<div class="gcp-phone">{contact.phones.join(', ')}</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<div class="gcp-footer">
				<button class="btn btn-secondary" onclick={closeModal}>Cancelar</button>
				<button class="btn btn-primary" onclick={confirmSelection} disabled={selectedCount === 0}>
					Importar {selectedCount > 0 ? `(${selectedCount})` : ''}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.google-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		justify-content: center;
	}
	.loader-sm {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255,255,255,0.3);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	/* Overlay */
	.gcp-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.6);
		backdrop-filter: blur(4px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	.gcp-modal {
		background: var(--card-bg, #1a1a2e);
		border-radius: 16px;
		width: 100%;
		max-width: 480px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 20px 60px rgba(0,0,0,0.5);
	}
	.gcp-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255,255,255,0.08);
	}
	.gcp-header h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}
	.gcp-close {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}
	.gcp-search {
		padding: 0.75rem 1.25rem;
	}
	.gcp-actions-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.25rem 0.5rem;
		font-size: 0.8rem;
	}
	.gcp-select-all {
		background: none;
		border: none;
		color: var(--primary, #8b5cf6);
		cursor: pointer;
		font-size: 0.8rem;
		padding: 0;
		text-decoration: underline;
	}
	.gcp-count {
		color: var(--text-muted);
	}
	.gcp-list {
		flex: 1;
		overflow-y: auto;
		padding: 0 0.5rem;
		min-height: 200px;
		max-height: 400px;
	}
	.gcp-empty {
		text-align: center;
		padding: 2rem;
		color: var(--text-muted);
	}
	.gcp-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.75rem;
		border-radius: 10px;
		cursor: pointer;
		transition: background 0.15s;
	}
	.gcp-item:hover {
		background: rgba(255,255,255,0.05);
	}
	.gcp-item.selected {
		background: rgba(139, 92, 246, 0.1);
	}
	.gcp-check {
		width: 22px;
		height: 22px;
		border-radius: 6px;
		border: 2px solid rgba(255,255,255,0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		color: white;
		flex-shrink: 0;
		transition: all 0.15s;
	}
	.gcp-check.checked {
		background: var(--primary, #8b5cf6);
		border-color: var(--primary, #8b5cf6);
	}
	.gcp-info {
		min-width: 0;
	}
	.gcp-name {
		font-weight: 500;
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.gcp-phone {
		font-size: 0.78rem;
		color: var(--text-muted);
		font-family: monospace;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.gcp-footer {
		display: flex;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid rgba(255,255,255,0.08);
	}
	.gcp-footer .btn {
		flex: 1;
	}
</style>
