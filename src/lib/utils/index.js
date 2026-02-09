/**
 * Format Ecuador phone number: 099-XXX-XXXX
 * @param {string} phone
 * @returns {string}
 */
export function formatPhone(phone) {
	if (!phone) return '-';
	const clean = phone.replace(/\D/g, '');
	if (clean.length === 10) {
		return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
	}
	return phone;
}

/**
 * Format ISO date to short Spanish format
 * @param {string} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
	if (!dateString) return '-';
	const date = new Date(dateString);
	return date.toLocaleDateString('es-EC', {
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Format ISO date to full format
 * @param {string} dateString
 * @returns {string}
 */
export function formatDateFull(dateString) {
	if (!dateString) return '-';
	const date = new Date(dateString);
	return date.toLocaleString('es-EC', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Get initials from name, or last 2 digits from phone/cedula
 * @param {string} value
 * @returns {string}
 */
export function getInitials(value) {
	if (!value) return '?';
	if (/^\d+$/.test(value.replace(/\D/g, ''))) {
		return value.slice(-2);
	}
	return value.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

/**
 * Validate Ecuador phone number (10 digits)
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
	if (!phone) return false;
	return /^\d{10}$/.test(phone.replace(/\D/g, ''));
}

/**
 * Clean and normalize phone number
 * @param {string} phone
 * @returns {string|null}
 */
export function cleanPhoneNumber(phone) {
	if (!phone) return null;
	let clean = phone.replace(/[\s\-\(\)]/g, '');

	if (clean.startsWith('+593')) {
		clean = '0' + clean.slice(4);
	} else if (clean.startsWith('593')) {
		clean = '0' + clean.slice(3);
	}

	if (!clean.startsWith('0') && clean.length === 9) {
		clean = '0' + clean;
	}

	return clean.length === 10 ? clean : null;
}

/**
 * Debounce function execution
 * @param {Function} func
 * @param {number} wait - milliseconds
 * @returns {Function}
 */
export function debounce(func, wait) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

/**
 * Format countdown from timestamp
 * @param {number} targetTimestamp
 * @returns {string}
 */
export function formatCountdown(targetTimestamp) {
	const diff = targetTimestamp - Date.now();
	if (diff <= 0) return 'Enviando...';

	const h = Math.floor(diff / 3600000);
	const m = Math.floor((diff % 3600000) / 60000);
	const s = Math.floor((diff % 60000) / 1000);

	if (h > 0) return `${h}h ${m}m ${s}s`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}
