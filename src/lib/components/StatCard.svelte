<script>
	/** @type {string} */
	let { icon = '', label = '', value = '-', subtitle = '' } = $props();
</script>

<div class="stat-card">
	<h3>{icon} {label}</h3>
	<div class="stat-value">{value}</div>
	{#if subtitle}
		<div class="stat-subtitle">{@html subtitle}</div>
	{/if}
</div>
