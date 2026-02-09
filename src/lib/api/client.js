import { PUBLIC_API_BASE_URL, PUBLIC_AUTH_USER, PUBLIC_AUTH_PASS } from '$env/static/public';

const BASE_URL = PUBLIC_API_BASE_URL;
const AUTH_HEADER = 'Basic ' + btoa(`${PUBLIC_AUTH_USER}:${PUBLIC_AUTH_PASS}`);

/**
 * Authenticated fetch wrapper
 * @param {string} endpoint - API endpoint (relative to BASE_URL)
 * @param {object} options - fetch options
 * @returns {Promise<any>} parsed JSON response
 */
export async function apiFetch(endpoint, options = {}) {
	const url = `${BASE_URL}${endpoint}`;

	const config = {
		headers: {
			'Authorization': AUTH_HEADER,
			'Content-Type': 'application/json',
			...options.headers
		},
		...options
	};

	const response = await fetch(url, config);

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
		throw new Error(error.message || `Error ${response.status}`);
	}

	return response.json();
}

/**
 * Unauthenticated fetch (for public endpoints like token generation)
 */
export async function publicFetch(endpoint, options = {}) {
	const url = `${BASE_URL}${endpoint}`;

	const config = {
		headers: {
			'Content-Type': 'application/json',
			...options.headers
		},
		...options
	};

	const response = await fetch(url, config);

	if (!response.ok) {
		throw new Error(`Error ${response.status}`);
	}

	return response.json();
}

export { BASE_URL, AUTH_HEADER };
