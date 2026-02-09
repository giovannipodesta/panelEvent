<script>
	let {
		open = false,
		icon = '',
		iconType = 'aprobar',
		title = '',
		description = '',
		confirmLabel = 'Confirmar',
		confirmClass = 'btn-primary',
		loading = false,
		onconfirm = () => {},
		oncancel = () => {}
	} = $props();

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) oncancel();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={handleBackdropClick}>
		<div class="modal-content">
			<div class="modal-icon {iconType}">{icon}</div>
			<h3 class="modal-title">{title}</h3>
			<p class="modal-description">{description}</p>
			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={oncancel} disabled={loading}>
					Cancelar
				</button>
				<button class="btn {confirmClass}" onclick={onconfirm} disabled={loading}>
					{#if loading}
						<span class="loader"></span>
					{:else}
						{confirmLabel}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
