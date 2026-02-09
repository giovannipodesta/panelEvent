/**
 * Toast store using Svelte 5 runes
 */

let _message = $state('');
let _type = $state('success');
let _visible = $state(false);
let _timeout;

export const toastStore = {
	get message() { return _message; },
	get type() { return _type; },
	get visible() { return _visible; },

	show(message, type = 'success', duration = 3000) {
		clearTimeout(_timeout);
		_message = message;
		_type = type;
		_visible = true;
		_timeout = setTimeout(() => {
			_visible = false;
		}, duration);
	},

	hide() {
		clearTimeout(_timeout);
		_visible = false;
	}
};
