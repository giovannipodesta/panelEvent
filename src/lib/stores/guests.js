import { writable, derived } from 'svelte/store';

const STORAGE_KEY = 'guestList';
const MAX_REF_KEY = 'maxReferidosConfig';

function loadFromStorage() {
	if (typeof localStorage === 'undefined') return [];
	try {
		let list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
		// Migrate old format (array of strings) to new format (array of objects)
		if (list.length > 0 && typeof list[0] === 'string') {
			const maxRef = parseInt(localStorage.getItem(MAX_REF_KEY)) || 1;
			list = list.map(num => ({ numero: num, maxReferidos: maxRef }));
		}
		return list;
	} catch {
		return [];
	}
}

function loadMaxReferidos() {
	if (typeof localStorage === 'undefined') return 1;
	return parseInt(localStorage.getItem(MAX_REF_KEY)) || 1;
}

function createGuestListStore() {
	const { subscribe, update, set } = writable(loadFromStorage());

	function save(list) {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
		}
	}

	return {
		subscribe,
		add(number, maxReferidos) {
			update(list => {
				if (list.some(g => g.numero === number)) return list;
				const newList = [{ numero: number, maxReferidos }, ...list];
				save(newList);
				return newList;
			});
		},
		addMultiple(numbers, maxReferidos) {
			update(list => {
				let added = 0;
				const newList = [...list];
				for (const num of numbers) {
					if (!newList.some(g => g.numero === num)) {
						newList.unshift({ numero: num, maxReferidos });
						added++;
					}
				}
				save(newList);
				return newList;
			});
			return true;
		},
		remove(number) {
			update(list => {
				const newList = list.filter(g => g.numero !== number);
				save(newList);
				return newList;
			});
		},
		updateMaxReferidos(number, delta) {
			update(list => {
				const newList = list.map(g => {
					if (g.numero === number) {
						const newVal = g.maxReferidos + delta;
						if (newVal >= 0 && newVal <= 10) {
							return { ...g, maxReferidos: newVal };
						}
					}
					return g;
				});
				save(newList);
				return newList;
			});
		},
		clear() {
			set([]);
			save([]);
		}
	};
}

function createMaxReferidosStore() {
	const { subscribe, set, update } = writable(loadMaxReferidos());

	return {
		subscribe,
		increment() {
			update(v => {
				const newVal = Math.min(v + 1, 10);
				if (typeof localStorage !== 'undefined') localStorage.setItem(MAX_REF_KEY, newVal);
				return newVal;
			});
		},
		decrement() {
			update(v => {
				const newVal = Math.max(v - 1, 0);
				if (typeof localStorage !== 'undefined') localStorage.setItem(MAX_REF_KEY, newVal);
				return newVal;
			});
		}
	};
}

export const guestList = createGuestListStore();
export const maxReferidos = createMaxReferidosStore();
export const guestCount = derived(guestList, $list => $list.length);
