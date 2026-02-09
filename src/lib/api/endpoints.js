import { PUBLIC_EVENT_ID } from '$env/static/public';
import { apiFetch, publicFetch } from './client.js';

const EVENT_ID = PUBLIC_EVENT_ID;

// ==========================================
// TOKEN (página /token)
// ==========================================

export function generateToken() {
	return publicFetch('/generar-token', { method: 'POST' });
}

// ==========================================
// INVITACIONES BULK (página /)
// ==========================================

export function processBulkInvitations(invitados) {
	return apiFetch(`/invitaciones/bulk/${EVENT_ID}`, {
		method: 'POST',
		body: JSON.stringify({ invitados })
	});
}

// ==========================================
// STATS (páginas / y /admin)
// ==========================================

export function getTokenStats() {
	return apiFetch('/stats/tokens');
}

export function getUserStats() {
	return apiFetch('/stats/usuarios');
}

export function getEvolutionStats() {
	return apiFetch(`/evolution-stats/stats/${EVENT_ID}`);
}

export function getProgramados() {
	return apiFetch(`/evolution-stats/programados/${EVENT_ID}`);
}

export function getHistorial(limite = 20) {
	return apiFetch(`/evolution-stats/historial/${EVENT_ID}?limite=${limite}`);
}

// ==========================================
// GESTION: REGISTROS (página /admin)
// Lista usuarios de todos los tipos con filtros
// Reemplaza el viejo /usuarios-pendientes
// ==========================================

export function getRegistros(params = {}) {
	const query = new URLSearchParams();
	if (params.tipo) query.set('tipo', params.tipo);
	if (params.aprobado !== undefined) query.set('aprobado', params.aprobado);
	if (params.asistencia !== undefined) query.set('asistencia', params.asistencia);
	if (params.categoria) query.set('categoria', params.categoria);
	if (params.buscar) query.set('buscar', params.buscar);
	if (params.pagina) query.set('pagina', params.pagina);
	if (params.limite) query.set('limite', params.limite);
	const qs = query.toString();
	return apiFetch(`/gestion/registros${qs ? '?' + qs : ''}`);
}

export function getPendingUsers() {
	return getRegistros({ tipo: 'solicitante', aprobado: false });
}

export function getApprovedUsers() {
	return getRegistros({ tipo: 'solicitante', aprobado: true });
}

export function approveUser(idUuid) {
	return apiFetch(`/users/${idUuid}/aprobar`, {
		method: 'PATCH',
		body: JSON.stringify({ asistencia: true })
	});
}

// ==========================================
// GESTION: INVITADOS (página /invitados)
// Lista tokens/invitaciones VIP + referidos
// ==========================================

export function getInvitados(params = {}) {
	const query = new URLSearchParams();
	if (params.tipo) query.set('tipo', params.tipo);
	if (params.estado) query.set('estado', params.estado);
	if (params.aceptacion) query.set('aceptacion', params.aceptacion);
	if (params.buscar) query.set('buscar', params.buscar);
	if (params.pagina) query.set('pagina', params.pagina);
	if (params.limite) query.set('limite', params.limite);
	const qs = query.toString();
	return apiFetch(`/gestion/invitados${qs ? '?' + qs : ''}`);
}

export function getInvitadoDetalle(telefono) {
	return apiFetch(`/gestion/invitado/${telefono}`);
}

export function getInvitadosEspeciales() {
	return getInvitados();
}

export function updateMaxReferidos(tokenId, maxReferidos) {
	return apiFetch('/panel/actualizar-max-referidos', {
		method: 'PATCH',
		body: JSON.stringify({ tokenId, maxReferidos })
	});
}

// ==========================================
// GESTION: REFERIDOS (página /referidos)
// ==========================================

export function getReferidos() {
	return apiFetch('/panel/invitados-especiales');
}

export function aprobarReferido(tokenId) {
	return apiFetch('/panel/aprobar-referido', {
		method: 'POST',
		body: JSON.stringify({ tokenId })
	});
}

export function rechazarReferido(tokenId) {
	return apiFetch('/panel/rechazar-referido', {
		method: 'POST',
		body: JSON.stringify({ tokenId })
	});
}

// ==========================================
// GESTION: ACCIONES AVANZADAS
// Disponibles en /invitados, /referidos, /admin
// ==========================================

export function revocarInvitacion(tokenId) {
	return apiFetch(`/gestion/invitacion/${tokenId}`, { method: 'DELETE' });
}

export function eliminarRegistro(idUuid) {
	return apiFetch(`/gestion/registro/${idUuid}`, { method: 'DELETE' });
}

export function anularQR(idUuid) {
	return apiFetch(`/gestion/qr/${idUuid}/anular`, { method: 'PATCH' });
}

export function desaprobarUsuario(idUuid) {
	return apiFetch(`/gestion/usuario/${idUuid}/desaprobar`, { method: 'PATCH' });
}

export function eliminarToken(tokenId) {
	return apiFetch(`/gestion/token/${tokenId}`, { method: 'DELETE' });
}

// ==========================================
// CIUDADANO: Consulta pública por cédula
// ==========================================

export function consultarCiudadano(cedula) {
	return apiFetch(`/ciudadano/consultar/${cedula}`);
}

export function consultarAntecedentes(cedula) {
	return apiFetch(`/ciudadano/antecedentes/${cedula}`);
}

export function consultarNombre(cedula) {
	return apiFetch(`/ciudadano/nombre/${cedula}`);
}
