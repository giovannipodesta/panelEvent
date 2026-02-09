/**
 * Guest list store using Svelte 5 runes
 * .svelte.js allows $state/$derived outside components
 */

const STORAGE_KEY = 'guestList';
const MAX_REF_KEY = 'maxReferidosConfig';

function loadFromStorage() {
	if (typeof localStorage === 'undefined') return [];
	try {
		let list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
		if (list.length > 0 && typeof list[0] === 'string') {
			const maxRef = parseInt(localStorage.getItem(MAX_REF_KEY)) || 1;
			list = list.map(num => ({ numero: num, maxReferidos: maxRef }));
		}
		return list.filter(g => g && g.numero);
	} catch {
		return [];
	}
}

function loadMaxReferidos() {
	if (typeof localStorage === 'undefined') return 1;
	return parseInt(localStorage.getItem(MAX_REF_KEY)) || 1;
}

function save(list) {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
	}
}

// Reactive state using Svelte 5 runes
let _guests = $state(loadFromStorage());
let _maxReferidos = $state(loadMaxReferidos());

export const guestStore = {
	get list() { return _guests; },
	get count() { return _guests.length; },
	get maxReferidos() { return _maxReferidos; },

	add(number, maxReferidos) {
		if (_guests.some(g => g.numero === number)) return false;
		_guests = [{ numero: number, maxReferidos }, ..._guests];
		save(_guests);
		return true;
	},

	addMultiple(numbers, maxReferidos) {
		let added = 0;
		const newList = [..._guests];
		for (const num of numbers) {
			if (!newList.some(g => g.numero === num)) {
				newList.unshift({ numero: num, maxReferidos });
				added++;
			}
		}
		if (added > 0) {
			_guests = newList;
			save(_guests);
		}
		return added;
	},

	remove(number) {
		_guests = _guests.filter(g => g.numero !== number);
		save(_guests);
	},

	updateGuestMaxRef(number, delta) {
		_guests = _guests.map(g => {
			if (g.numero === number) {
				const newVal = g.maxReferidos + delta;
				if (newVal >= 0 && newVal <= 10) {
					return { ...g, maxReferidos: newVal };
				}
			}
			return g;
		});
		save(_guests);
	},

	clear() {
		_guests = [];
		save([]);
	},

	incrementMaxRef() {
		const newVal = Math.min(_maxReferidos + 1, 10);
		_maxReferidos = newVal;
		if (typeof localStorage !== 'undefined') localStorage.setItem(MAX_REF_KEY, newVal);
	},

	decrementMaxRef() {
		const newVal = Math.max(_maxReferidos - 1, 0);
		_maxReferidos = newVal;
		if (typeof localStorage !== 'undefined') localStorage.setItem(MAX_REF_KEY, newVal);
	}
};
