<script>
	import { onMount } from 'svelte';
	import { consultarCiudadano, consultarAntecedentes } from '$lib/api/endpoints.js';

	let { cedula } = $props();

	let loading = $state(true);
	let expanded = $state(false);
	let datos = $state(null);
	let antecedentes = $state(null);
	let error = $state(null);

	onMount(() => {
		if (cedula) fetchData();
	});

	async function fetchData() {
		loading = true;
		error = null;
		try {
			const [cRes, aRes] = await Promise.all([
				consultarCiudadano(cedula),
				consultarAntecedentes(cedula)
			]);
			if (!cRes.enabled) { error = 'disabled'; loading = false; return; }
			if (cRes.success) datos = cRes.datos;
			if (aRes.success && aRes.enabled) antecedentes = aRes.antecedentes;
		} catch (e) {
			error = e.message || 'Error';
		} finally {
			loading = false;
		}
	}

	function toggle(e) {
		e.stopPropagation();
		expanded = !expanded;
	}

	function stop(e) { e.stopPropagation(); }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if cedula}
	<div class="ci" onclick={stop}>
		{#if loading}
			<div class="ci-pill ci-pill-muted">
				<span class="loader" style="width:12px;height:12px;"></span>
				<span>Verificando...</span>
			</div>
		{:else if error === 'disabled'}
			<!-- service off, render nothing -->
		{:else if error}
			<div class="ci-pill ci-pill-muted">{error}</div>
		{:else}
			<!-- COLLAPSED: badge preview + expand button -->
			<button class="ci-pill" class:ci-pill-ok={antecedentes && !antecedentes.tiene} class:ci-pill-bad={antecedentes?.tiene} onclick={toggle}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
				</svg>
				{#if antecedentes?.tiene}
					<span>{antecedentes.cantidad} antecedente{antecedentes.cantidad !== 1 ? 's' : ''}</span>
				{:else}
					<span>Limpio</span>
				{/if}
				<svg class="ci-chevron" class:ci-chevron-up={expanded} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<polyline points="6 9 12 15 18 9"></polyline>
				</svg>
			</button>

			<!-- EXPANDED: full details -->
			{#if expanded}
				<div class="ci-details">
					{#if datos}
						<div class="ci-row">
							<span class="ci-l">Registro Civil</span>
							<span class="ci-v">{datos.nombre || '-'}</span>
						</div>
						{#if datos.edad}
							<div class="ci-row">
								<span class="ci-l">Edad</span>
								<span class="ci-v">{datos.edad}</span>
							</div>
						{/if}
						{#if datos.profesion}
							<div class="ci-row">
								<span class="ci-l">Profesión</span>
								<span class="ci-v">{datos.profesion}</span>
							</div>
						{/if}
						{#if datos.estadoCivil}
							<div class="ci-row">
								<span class="ci-l">Estado Civil</span>
								<span class="ci-v">{datos.estadoCivil}</span>
							</div>
						{/if}
					{/if}
					{#if antecedentes?.tiene && antecedentes.detalle?.length > 0}
						<div class="ci-det-list">
							<div class="ci-det-title">Detalle de antecedentes</div>
							{#each antecedentes.detalle as d}
								<div class="ci-det">
									<span class="ci-det-crime">{d.nombreDelito || 'Sin tipo'}</span>
									{#if d.nombreJudicatura}<span class="ci-det-sub">{d.nombreJudicatura}</span>{/if}
									{#if d.fechaProvidencia}<span class="ci-det-sub">{d.fechaProvidencia}</span>{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
{/if}

<style>
	.ci { margin-top: 0.4rem; }

	/* Pill / badge — always visible as collapsed preview */
	.ci-pill {
		display: inline-flex; align-items: center; gap: 0.35rem;
		padding: 0.35rem 0.65rem; border-radius: 8px;
		font-size: 0.82rem; font-weight: 600; font-family: inherit;
		cursor: pointer; border: 1px solid; transition: all 0.15s;
		min-height: 34px;
	}
	.ci-pill-ok {
		background: rgba(16, 185, 129, 0.1); color: var(--success);
		border-color: rgba(16, 185, 129, 0.3);
	}
	.ci-pill-ok:hover { background: rgba(16, 185, 129, 0.18); }
	.ci-pill-bad {
		background: rgba(239, 68, 68, 0.1); color: var(--danger);
		border-color: rgba(239, 68, 68, 0.35);
		animation: ci-pulse 2s infinite;
	}
	.ci-pill-bad:hover { background: rgba(239, 68, 68, 0.18); }
	.ci-pill-muted {
		background: rgba(255,255,255,0.04); color: var(--text-muted);
		border-color: var(--border-color); cursor: default;
		font-weight: 500;
	}
	@keyframes ci-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }

	.ci-chevron { transition: transform 0.2s; flex-shrink: 0; }
	.ci-chevron-up { transform: rotate(180deg); }

	/* Expanded detail panel */
	.ci-details {
		margin-top: 0.35rem; padding: 0.5rem 0.7rem;
		background: rgba(0,0,0,0.12); border-radius: 8px;
		border: 1px solid var(--border-color); font-size: 0.82rem;
	}
	.ci-row { display: flex; justify-content: space-between; align-items: baseline; padding: 0.15rem 0; gap: 0.5rem; }
	.ci-l { color: var(--text-muted); font-size: 0.75rem; white-space: nowrap; }
	.ci-v { text-align: right; font-weight: 500; word-break: break-word; }

	.ci-det-list {
		margin-top: 0.4rem; padding: 0.4rem 0.5rem;
		background: rgba(239,68,68,0.06); border-radius: 6px;
		border: 1px solid rgba(239,68,68,0.18);
	}
	.ci-det-title { font-size: 0.72rem; color: var(--danger); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.25rem; }
	.ci-det { padding: 0.2rem 0; display: flex; flex-direction: column; gap: 0.05rem; }
	.ci-det + .ci-det { border-top: 1px solid rgba(255,255,255,0.04); padding-top: 0.3rem; }
	.ci-det-crime { font-weight: 600; color: var(--danger); font-size: 0.8rem; }
	.ci-det-sub { font-size: 0.72rem; color: var(--text-muted); }
</style>
