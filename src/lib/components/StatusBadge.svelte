<script>
	/** @type {string} */
	let { status = '', size = 'normal' } = $props();

	const variants = {
		habilitado: 'badge-warning',
		consumido: 'badge-info',
		ACEPTADO: 'badge-success',
		aceptado: 'badge-success',
		RECHAZADO: 'badge-danger',
		rechazado: 'badge-danger',
		pendiente: 'badge-muted',
		enviado: 'badge-success',
		error: 'badge-danger',
		procesando: 'badge-info'
	};

	let cls = $derived(variants[status] || 'badge-muted');
</script>

<span class="badge {cls}" class:badge-sm={size === 'sm'}>
	{status || 'N/A'}
</span>

<style>
	.badge-sm {
		font-size: 0.65rem;
		padding: 2px 6px;
	}
</style>
