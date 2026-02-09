<script>
	let { onimport } = $props();

	let showModal = $state(false);
	let contacts = $state.raw([]);
	let selected = $state(new Set());
	let searchTerm = $state('');
	let dragOver = $state(false);
	let parsing = $state(false);
	let errorMsg = $state('');
	let fileName = $state('');

	let filteredContacts = $derived.by(() => {
		if (!searchTerm) return contacts;
		const q = searchTerm.toLowerCase();
		return contacts.filter(c =>
			c.name.toLowerCase().includes(q) ||
			c.phones.some(p => p.includes(q))
		);
	});

	let selectedCount = $derived(selected.size);

	// =========================================
	// vCard (.vcf) Parser — RFC 6350 compliant
	// =========================================
	function parseVCard(text) {
		const results = [];
		// Split into individual vCard blocks
		const cards = text.split(/(?=BEGIN:VCARD)/i);

		for (const card of cards) {
			if (!card.trim().toUpperCase().startsWith('BEGIN:VCARD')) continue;

			let name = 'Sin nombre';
			const phones = [];

			// Unfold continued lines (RFC 6350: lines starting with space/tab are continuations)
			const unfolded = card.replace(/\r?\n[ \t]/g, '');
			const lines = unfolded.split(/\r?\n/);

			for (const line of lines) {
				// FN (Formatted Name)
				if (/^FN[;:]/.test(line)) {
					const val = line.substring(line.indexOf(':') + 1).trim();
					if (val) name = val;
				}
				// N (Structured Name) — fallback if no FN
				else if (/^N[;:]/.test(line) && name === 'Sin nombre') {
					const val = line.substring(line.indexOf(':') + 1).trim();
					const parts = val.split(';');
					const fullName = [parts[1], parts[0]].filter(Boolean).join(' ').trim();
					if (fullName) name = fullName;
				}
				// TEL (Phone)
				else if (/^TEL[;:]/.test(line)) {
					let val = line.substring(line.indexOf(':') + 1).trim();
					// Handle tel: URI format
					val = val.replace(/^tel:/i, '');
					const cleaned = cleanPhone(val);
					if (cleaned) phones.push(cleaned);
				}
			}

			if (phones.length > 0) {
				results.push({ name, phones });
			}
		}
		return results;
	}

	// =========================================
	// CSV Parser — handles Google/Outlook/Apple exports
	// =========================================
	function parseCSV(text) {
		const results = [];
		const lines = text.split(/\r?\n/).filter(l => l.trim());
		if (lines.length < 2) return results;

		// Parse header
		const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

		// Find name and phone columns
		const nameIdx = headers.findIndex(h =>
			h.includes('name') || h.includes('nombre') || h === 'fn' || h === 'display name'
		);
		const firstNameIdx = headers.findIndex(h =>
			h === 'first name' || h === 'given name' || h.includes('primer')
		);
		const lastNameIdx = headers.findIndex(h =>
			h === 'last name' || h === 'family name' || h.includes('apellido')
		);

		// Find ALL phone columns
		const phoneIdxs = [];
		headers.forEach((h, i) => {
			if (h.includes('phone') || h.includes('tel') || h.includes('móvil') ||
				h.includes('movil') || h.includes('celular') || h.includes('mobile') ||
				h.includes('número') || h.includes('numero')) {
				phoneIdxs.push(i);
			}
		});

		// If no phone columns found, try to detect by content
		if (phoneIdxs.length === 0) {
			// Check first data row for phone-like content
			if (lines.length > 1) {
				const sample = parseCSVLine(lines[1]);
				sample.forEach((val, i) => {
					if (/^\+?\d[\d\s\-()]{7,}$/.test(val.trim())) phoneIdxs.push(i);
				});
			}
		}

		if (phoneIdxs.length === 0) return results;

		// Parse data rows
		for (let i = 1; i < lines.length; i++) {
			const cols = parseCSVLine(lines[i]);
			if (cols.length === 0) continue;

			let name = 'Sin nombre';
			if (nameIdx >= 0 && cols[nameIdx]?.trim()) {
				name = cols[nameIdx].trim();
			} else if (firstNameIdx >= 0) {
				name = [cols[firstNameIdx], cols[lastNameIdx]]
					.filter(Boolean)
					.map(s => s.trim())
					.filter(Boolean)
					.join(' ') || 'Sin nombre';
			}

			const phones = [];
			for (const idx of phoneIdxs) {
				if (cols[idx]) {
					const cleaned = cleanPhone(cols[idx]);
					if (cleaned) phones.push(cleaned);
				}
			}

			if (phones.length > 0) {
				results.push({ name, phones });
			}
		}
		return results;
	}

	// Parse a single CSV line respecting quoted fields
	function parseCSVLine(line) {
		const result = [];
		let current = '';
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (inQuotes) {
				if (ch === '"' && line[i + 1] === '"') {
					current += '"';
					i++;
				} else if (ch === '"') {
					inQuotes = false;
				} else {
					current += ch;
				}
			} else {
				if (ch === '"') {
					inQuotes = true;
				} else if (ch === ',') {
					result.push(current);
					current = '';
				} else {
					current += ch;
				}
			}
		}
		result.push(current);
		return result;
	}

	// Clean phone to Ecuador 10-digit format
	function cleanPhone(raw) {
		let num = raw.replace(/[\s\-\(\)\.]/g, '');
		if (num.startsWith('+593')) num = '0' + num.slice(4);
		else if (num.startsWith('593')) num = '0' + num.slice(3);
		// Accept 10-digit Ecuador numbers
		if (/^0\d{9}$/.test(num)) return num;
		return null;
	}

	// =========================================
	// File handling
	// =========================================
	function handleFile(file) {
		if (!file) return;
		const ext = file.name.split('.').pop()?.toLowerCase();
		if (!['vcf', 'csv', 'txt'].includes(ext)) {
			errorMsg = 'Formato no soportado. Usa .vcf, .csv o .txt';
			return;
		}

		parsing = true;
		errorMsg = '';
		fileName = file.name;

		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result;
			let parsed = [];

			if (ext === 'vcf') {
				parsed = parseVCard(text);
			} else {
				// Try CSV first, fallback to plain text
				parsed = parseCSV(text);
				if (parsed.length === 0) {
					// Treat as plain text with numbers
					const nums = text.split(/[\s,;\n\r\t|]+/).map(s => cleanPhone(s.trim())).filter(Boolean);
					parsed = nums.map(n => ({ name: n, phones: [n] }));
				}
			}

			contacts = parsed;
			selected = new Set();
			searchTerm = '';
			parsing = false;

			if (parsed.length === 0) {
				errorMsg = 'No se encontraron contactos con teléfono válido';
			} else {
				showModal = true;
			}
		};
		reader.onerror = () => {
			parsing = false;
			errorMsg = 'Error al leer el archivo';
		};
		reader.readAsText(file);
	}

	function onFileSelect(e) {
		const file = e.target?.files?.[0];
		if (file) handleFile(file);
		e.target.value = '';
	}

	function onDrop(e) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) handleFile(file);
	}

	function onDragOver(e) {
		e.preventDefault();
		dragOver = true;
	}

	function toggleContact(idx) {
		const next = new Set(selected);
		if (next.has(idx)) next.delete(idx);
		else next.add(idx);
		selected = next;
	}

	function toggleAll() {
		if (selected.size === filteredContacts.length && filteredContacts.length > 0) {
			selected = new Set();
		} else {
			selected = new Set(filteredContacts.map(c => contacts.indexOf(c)));
		}
	}

	function confirmSelection() {
		const phones = [];
		for (const idx of selected) {
			for (const phone of contacts[idx].phones) {
				if (!phones.includes(phone)) phones.push(phone);
			}
		}
		showModal = false;
		if (onimport && phones.length > 0) {
			onimport(phones);
		}
	}

	function closeModal() {
		showModal = false;
		searchTerm = '';
		contacts = [];
		selected = new Set();
	}
</script>

<!-- File input trigger (hidden) -->
<input
	type="file"
	accept=".vcf,.csv,.txt"
	id="contact-file-input"
	style="display: none;"
	onchange={onFileSelect}
/>

<!-- Import Button -->
<button
	class="contact-btn"
	style="flex: 1;"
	onclick={() => document.getElementById('contact-file-input')?.click()}
	disabled={parsing}
>
	{#if parsing}
		<span class="loader-sm"></span>
		<span>Leyendo...</span>
	{:else}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
			<polyline points="14 2 14 8 20 8"></polyline>
			<line x1="12" y1="18" x2="12" y2="12"></line>
			<line x1="9" y1="15" x2="15" y2="15"></line>
		</svg>
		<span>Archivo (.vcf/.csv)</span>
	{/if}
</button>

{#if errorMsg}
	<div style="font-size: 0.75rem; color: var(--danger); margin-top: 0.25rem; width: 100%;">{errorMsg}</div>
{/if}

<!-- Contact Selection Modal -->
{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="cfi-overlay" onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
		<div class="cfi-modal">
			<div class="cfi-header">
				<div>
					<h3>Seleccionar Contactos</h3>
					<span class="cfi-filename">{fileName}</span>
				</div>
				<button class="cfi-close" onclick={closeModal}>&times;</button>
			</div>

			<!-- Drop zone hint -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="cfi-dropzone"
				class:active={dragOver}
				ondrop={onDrop}
				ondragover={onDragOver}
				ondragleave={() => dragOver = false}
			>
				Arrastra otro archivo .vcf o .csv aquí
			</div>

			<div class="cfi-search">
				<input
					type="text"
					class="input"
					placeholder="Buscar contacto..."
					bind:value={searchTerm}
				/>
			</div>

			<div class="cfi-actions-bar">
				<button class="cfi-select-all" onclick={toggleAll}>
					{selected.size === filteredContacts.length && filteredContacts.length > 0 ? 'Deseleccionar todo' : 'Seleccionar todo'}
				</button>
				<span class="cfi-count">{contacts.length} contactos con teléfono</span>
			</div>

			<div class="cfi-list">
				{#if filteredContacts.length === 0}
					<div class="cfi-empty">No se encontraron contactos</div>
				{:else}
					{#each filteredContacts as contact, i}
						{@const realIdx = contacts.indexOf(contact)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="cfi-item"
							class:selected={selected.has(realIdx)}
							onclick={() => toggleContact(realIdx)}
						>
							<div class="cfi-check" class:checked={selected.has(realIdx)}>
								{#if selected.has(realIdx)}✓{/if}
							</div>
							<div class="cfi-info">
								<div class="cfi-name">{contact.name}</div>
								<div class="cfi-phone">{contact.phones.join(', ')}</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<div class="cfi-footer">
				<button class="btn btn-secondary" onclick={closeModal}>Cancelar</button>
				<button class="btn btn-primary" onclick={confirmSelection} disabled={selectedCount === 0}>
					Importar {selectedCount > 0 ? `(${selectedCount})` : ''}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.loader-sm {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255,255,255,0.3);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
		display: inline-block;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	/* Overlay */
	.cfi-overlay {
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
	.cfi-modal {
		background: var(--card-bg, #1a1a2e);
		border-radius: 16px;
		width: 100%;
		max-width: 480px;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 20px 60px rgba(0,0,0,0.5);
	}
	.cfi-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255,255,255,0.08);
	}
	.cfi-header h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}
	.cfi-filename {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-family: monospace;
	}
	.cfi-close {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}
	.cfi-dropzone {
		margin: 0.5rem 1.25rem;
		padding: 0.5rem;
		border: 2px dashed rgba(255,255,255,0.1);
		border-radius: 8px;
		text-align: center;
		font-size: 0.75rem;
		color: var(--text-muted);
		transition: all 0.2s;
	}
	.cfi-dropzone.active {
		border-color: var(--primary, #8b5cf6);
		background: rgba(139, 92, 246, 0.1);
		color: var(--primary, #8b5cf6);
	}
	.cfi-search {
		padding: 0.75rem 1.25rem;
	}
	.cfi-actions-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.25rem 0.5rem;
		font-size: 0.8rem;
	}
	.cfi-select-all {
		background: none;
		border: none;
		color: var(--primary, #8b5cf6);
		cursor: pointer;
		font-size: 0.8rem;
		padding: 0;
		text-decoration: underline;
	}
	.cfi-count {
		color: var(--text-muted);
	}
	.cfi-list {
		flex: 1;
		overflow-y: auto;
		padding: 0 0.5rem;
		min-height: 200px;
		max-height: 400px;
	}
	.cfi-empty {
		text-align: center;
		padding: 2rem;
		color: var(--text-muted);
	}
	.cfi-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.75rem;
		border-radius: 10px;
		cursor: pointer;
		transition: background 0.15s;
	}
	.cfi-item:hover {
		background: rgba(255,255,255,0.05);
	}
	.cfi-item.selected {
		background: rgba(139, 92, 246, 0.1);
	}
	.cfi-check {
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
	.cfi-check.checked {
		background: var(--primary, #8b5cf6);
		border-color: var(--primary, #8b5cf6);
	}
	.cfi-info {
		min-width: 0;
		flex: 1;
	}
	.cfi-name {
		font-weight: 500;
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.cfi-phone {
		font-size: 0.78rem;
		color: var(--text-muted);
		font-family: monospace;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.cfi-footer {
		display: flex;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid rgba(255,255,255,0.08);
	}
	.cfi-footer .btn {
		flex: 1;
	}
</style>
