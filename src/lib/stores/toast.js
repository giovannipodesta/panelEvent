import { writable } from 'svelte/store';

function createToastStore() {
	const { subscribe, set } = writable({ message: '', type: 'success', visible: false });
	let timeout;

	return {
		subscribe,
		show(message, type = 'success', duration = 3000) {
			clearTimeout(timeout);
			set({ message, type, visible: true });
			timeout = setTimeout(() => {
				set({ message: '', type: 'success', visible: false });
			}, duration);
		},
		hide() {
			clearTimeout(timeout);
			set({ message: '', type: 'success', visible: false });
		}
	};
}

export const toast = createToastStore();
