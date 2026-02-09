<script>
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import Toast from '$lib/components/Toast.svelte';
	import '../app.css';

	let { children } = $props();

	const navItems = [
		{
			href: `${base}/admin`,
			label: 'Aprobar',
			desc: 'Trabajadores',
			icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
			match: (p) => p.startsWith(`${base}/admin`)
		},
		{
			href: `${base}/`,
			label: 'Invitados',
			desc: 'VIP',
			icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
			match: (p) => p === `${base}` || p === `${base}/`
		},
		{
			href: `${base}/referidos`,
			label: 'Referidos',
			desc: 'Acompañantes',
			icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
			match: (p) => p.startsWith(`${base}/referidos`)
		},
		{
			href: `${base}/token`,
			label: 'Token',
			desc: 'Generar',
			icon: 'M3 11h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V11z M7 11V7a5 5 0 0 1 10 0v4',
			match: (p) => p.startsWith(`${base}/token`)
		}
	];

	let currentPath = $derived($page.url.pathname);
</script>

<div class="container">
	<header>
		<div class="logo-container">
			<img src="{base}/assets/Logo-large.webp" alt="Logo" class="logo" />
		</div>
		<h1>Panel de Gestión</h1>
		<p class="section-desc">Sistema de invitaciones y accesos al evento</p>
	</header>

	<nav class="tabs-container">
		{#each navItems as item}
			<a
				href={item.href}
				class="tab-btn"
				class:active={item.match(currentPath)}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
					fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					{#each item.icon.split(' M') as segment, i}
						<path d="{i === 0 ? segment : 'M' + segment}"></path>
					{/each}
				</svg>
				<span class="tab-label">
					<span class="tab-label-main">{item.label}</span>
					<span class="tab-label-desc">{item.desc}</span>
				</span>
			</a>
		{/each}
	</nav>

	<main>
		{@render children()}
	</main>
</div>

<Toast />

<style>
	header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.logo-container {
		margin-bottom: 0.75rem;
	}

	.logo {
		height: 48px;
		width: auto;
	}

	.tabs-container {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 1.5rem;
		background: var(--bg-secondary);
		border-radius: var(--radius-lg);
		padding: 0.35rem;
	}

	.tab-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		padding: 0.65rem 0.25rem;
		min-height: 56px;
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		color: var(--text-muted);
		font-family: inherit;
		cursor: pointer;
		transition: all 0.2s ease;
		text-decoration: none;
	}

	.tab-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.2;
	}

	.tab-label-main {
		font-size: 0.8rem;
		font-weight: 600;
	}

	.tab-label-desc {
		font-size: 0.65rem;
		opacity: 0.7;
	}

	.tab-btn:hover {
		color: var(--text-secondary);
	}

	.tab-btn.active {
		background: var(--bg-card);
		color: var(--text-primary);
		box-shadow: var(--shadow-sm);
	}
</style>
