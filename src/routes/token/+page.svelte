<script>
	import { toastStore as toast } from '$lib/stores/toast.svelte.js';
	import { generateToken } from '$lib/api/endpoints.js';

	let loading = $state(false);
	let result = $state(null);

	async function handleGenerate() {
		loading = true;
		result = null;
		try {
			const data = await generateToken();
			result = {
				url: data.url,
				estado: data.estado || 'Desconocido',
				id: data.id,
				createdAt: new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
			};
		} catch (e) {
			console.error(e);
			toast.show('Error al conectar con el servidor', 'error');
		} finally {
			loading = false;
		}
	}

	async function copyUrl() {
		if (!result?.url) return;
		try {
			await navigator.clipboard.writeText(result.url);
			toast.show('¡URL copiada!');
		} catch {
			toast.show('Error al copiar', 'error');
		}
	}
</script>

<svelte:head>
	<title>Token - Panel de Gestión</title>
</svelte:head>

<section>
	<div class="section-header" style="margin-bottom: 1.25rem;">
		<div>
			<h2>Generar Token</h2>
			<p class="section-desc">Crea un enlace de acceso único para el evento</p>
		</div>
	</div>

	<button class="btn btn-primary" style="width: 100%; font-size: 1.1rem; padding: 1rem;" onclick={handleGenerate} disabled={loading}>
		{#if loading}
			<span class="loader"></span>
		{:else}
			Generar Nuevo Token de Acceso
		{/if}
	</button>

	{#if result}
		<div class="card" style="margin-top: 1.25rem;">
			<div class="result-header">
				<span class="badge badge-success">{result.estado}</span>
				<span class="timestamp">{result.createdAt}</span>
			</div>

			<div style="margin-bottom: 1rem;">
				<label style="font-size: 0.9rem; color: var(--text-secondary); display: block; margin-bottom: 0.5rem;">URL de Invitación</label>
				<div class="input-group">
					<input type="text" class="input" value={result.url} readonly />
					<button class="btn btn-secondary" onclick={copyUrl} style="white-space: nowrap;">
						Copiar
					</button>
				</div>
			</div>

			<div class="token-info">
				<div class="info-item">
					<span class="label">ID del Token:</span>
					<span class="value">{result.id}</span>
				</div>
			</div>
		</div>
	{/if}
</section>
