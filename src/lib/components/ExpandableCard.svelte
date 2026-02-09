<script>
	let {
		title = '',
		icon = '',
		count = 0,
		onrefresh = null,
		children
	} = $props();

	let open = $state(false);
	let spinning = $state(false);

	function toggle() {
		open = !open;
	}

	async function handleRefresh(e) {
		e.stopPropagation();
		if (!onrefresh) return;
		spinning = true;
		try {
			await onrefresh();
		} finally {
			setTimeout(() => spinning = false, 500);
		}
	}
</script>

<div class="expandable-card" class:open>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="expandable-card-header" onclick={toggle}>
		<div class="expandable-card-title">
			<span class="icon">{icon}</span>
			<span>{title}</span>
		</div>
		<div class="expandable-card-badge">
			<span class="card-count-badge" class:empty={count === 0}>{count}</span>
			{#if onrefresh}
				<button class="refresh-btn-mini" class:spinning onclick={handleRefresh} title="Actualizar">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 2v6h-6"></path>
						<path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
						<path d="M3 22v-6h6"></path>
						<path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
					</svg>
				</button>
			{/if}
			<div class="expand-icon">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="6 9 12 15 18 9"></polyline>
				</svg>
			</div>
		</div>
	</div>
	{#if open}
		<div class="expandable-card-content" style="display: block;">
			<div class="expandable-card-body">
				{@render children()}
			</div>
		</div>
	{/if}
</div>
