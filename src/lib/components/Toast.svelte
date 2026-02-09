<script>
	import { toastStore } from '$lib/stores/toast.svelte.js';

	const colors = {
		success: { bg: 'rgba(255, 255, 255, 0.95)', color: '#000' },
		error: { bg: 'rgba(239, 68, 68, 0.95)', color: '#fff' },
		warning: { bg: 'rgba(255, 198, 0, 0.95)', color: '#000' }
	};

	let style = $derived(colors[toastStore.type] || colors.success);
</script>

{#if toastStore.visible}
	<div
		class="toast"
		style="background: {style.bg}; color: {style.color};"
	>
		{toastStore.message}
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.75rem 1.5rem;
		border-radius: 12px;
		font-size: 0.85rem;
		font-weight: 500;
		z-index: 9999;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
		animation: slideUp 0.3s ease;
		backdrop-filter: blur(10px);
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}
</style>
