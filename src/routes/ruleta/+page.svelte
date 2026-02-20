<script>
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { apiFetch } from '$lib/api/client.js';

	// State
	let names = $state([]);
	let isSpinning = $state(false);
	let isStopping = $state(false);
	let rotation = $state(0);
	let animationId = null;
	let winnerIndex = $state(null);
	let winnerName = $state('');
	let showWinnerScreen = $state(false);
	let nameInput = $state('');
	let bulkInput = $state('');
	let apiStatus = $state('');
	let apiStatusType = $state('');
	let apiLoading = $state(false);
	let devPanelOpen = $state(false);
	let loadingScreen = $state(true);
	let fullNames = $state([]);
	let canvas = $state(null);
	let ctx;
	let fullConfettiEl = $state(null);
	let lottieContainer = $state(null);
	let wheelRingEl = $state(null);
	let lottieAnim = null;
	let audioContext = null;
	let lastTickAngle = 0;
	let confettiInterval = null;

	const centerX = 400;
	const centerY = 400;
	const radius = 380;

	const wheelColors = [
		'#8b5cf6', '#ffc600', '#3b82f6', '#14b8a6',
		'#a78bfa', '#f59e0b', '#60a5fa', '#2dd4bf',
		'#7c3aed', '#eab308', '#2563eb', '#0d9488',
	];

	const confettiColors = ['#8b5cf6', '#ffc600', '#3b82f6', '#14b8a6', '#f59e0b', '#a78bfa', '#ef4444', '#10b981'];

	const toTitle = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

	// "TORRES ORTIZ JAIME FERNANDO" → "Jaime Torres" (for wheel segments)
	function formatNameShort(fullName) {
		if (!fullName) return '';
		const parts = fullName.trim().split(/\s+/);
		if (parts.length >= 4) return toTitle(parts[2]) + ' ' + toTitle(parts[0]);
		if (parts.length === 3) return toTitle(parts[2]) + ' ' + toTitle(parts[0]);
		if (parts.length === 2) return toTitle(parts[1]) + ' ' + toTitle(parts[0]);
		return toTitle(parts[0]);
	}

	// "TORRES ORTIZ JAIME FERNANDO" → "Jaime Fernando Torres Ortiz" (for winner screen)
	function formatNameFull(fullName) {
		if (!fullName) return '';
		const parts = fullName.trim().split(/\s+/).map(toTitle);
		if (parts.length >= 4) return parts.slice(2).join(' ') + ' ' + parts.slice(0, 2).join(' ');
		if (parts.length === 3) return parts[2] + ' ' + parts[0] + ' ' + parts[1];
		return parts.join(' ');
	}

	// --- Audio ---
	function initAudio() {
		if (!audioContext) {
			audioContext = new (window.AudioContext || window.webkitAudioContext)();
		}
	}

	function playTick() {
		try {
			initAudio();
			const osc = audioContext.createOscillator();
			const gain = audioContext.createGain();
			osc.connect(gain);
			gain.connect(audioContext.destination);
			osc.frequency.value = 1200 + Math.random() * 400;
			osc.type = 'sine';
			gain.gain.setValueAtTime(0.06, audioContext.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.04);
			osc.start(audioContext.currentTime);
			osc.stop(audioContext.currentTime + 0.04);
		} catch (e) {}
	}

	function playVictorySound() {
		try {
			initAudio();
			const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
			melody.forEach((freq, i) => {
				const osc = audioContext.createOscillator();
				const gain = audioContext.createGain();
				osc.connect(gain);
				gain.connect(audioContext.destination);
				osc.frequency.value = freq;
				osc.type = i < 4 ? 'sine' : 'triangle';
				const t = audioContext.currentTime + i * 0.12;
				gain.gain.setValueAtTime(0.2, t);
				gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
				osc.start(t);
				osc.stop(t + 0.35);
			});
		} catch (e) {}
	}

	function playDrumroll() {
		try {
			initAudio();
			for (let i = 0; i < 25; i++) {
				const osc = audioContext.createOscillator();
				const gain = audioContext.createGain();
				osc.connect(gain);
				gain.connect(audioContext.destination);
				osc.frequency.value = 180 + Math.random() * 120;
				osc.type = 'triangle';
				const t = audioContext.currentTime + (i / 25) * 1.0;
				gain.gain.setValueAtTime(0.04 + (i / 25) * 0.08, t);
				gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
				osc.start(t);
				osc.stop(t + 0.035);
			}
		} catch (e) {}
	}

	// --- Canvas ---
	function drawWheel() {
		if (!ctx) return;
		ctx.clearRect(0, 0, 800, 800);

		if (names.length === 0) {
			ctx.beginPath();
			ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
			ctx.fillStyle = '#111118';
			ctx.fill();
			ctx.strokeStyle = 'rgba(139,92,246,0.15)';
			ctx.lineWidth = 3;
			ctx.stroke();
			ctx.fillStyle = '#555';
			ctx.font = 'bold 20px Inter, system-ui, sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('Cargando participantes...', centerX, centerY);
			return;
		}

		const n = names.length;
		const anglePerSegment = (2 * Math.PI) / n;

		names.forEach((name, index) => {
			const startAngle = index * anglePerSegment + rotation;
			const endAngle = startAngle + anglePerSegment;

			ctx.beginPath();
			ctx.moveTo(centerX, centerY);
			ctx.arc(centerX, centerY, radius, startAngle, endAngle);
			ctx.closePath();

			ctx.fillStyle = wheelColors[index % wheelColors.length];
			ctx.fill();

			ctx.strokeStyle = 'rgba(0,0,0,0.35)';
			ctx.lineWidth = 1.5;
			ctx.stroke();

			// Text - use abbreviated name
			ctx.save();
			ctx.translate(centerX, centerY);
			ctx.rotate(startAngle + anglePerSegment / 2);
			ctx.textAlign = 'right';
			ctx.textBaseline = 'middle';

			const color = wheelColors[index % wheelColors.length];
			const isLight = color === '#ffc600' || color === '#f59e0b' || color === '#eab308' || color === '#2dd4bf';
			ctx.fillStyle = isLight ? '#0a0a0f' : '#ffffff';
			ctx.shadowColor = isLight ? 'transparent' : 'rgba(0,0,0,0.6)';
			ctx.shadowBur = isLight ? 0 : 3;
l
			const fontSize = n > 30 ? 10 : n > 20 ? 12 : n > 10 ? 14 : 16;
			ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
    
			const shortName = formatNameShort(name);
			const maxLen = n > 30 ? 10 : n > 20 ? 14 : 18;
			let displayName = shortName.length > maxLen ? shortName.substring(0, maxLen) + '..' : shortName;

			ctx.fillText(displayName, radius - 15, 0);
			ctx.restore();
		});

		// Outer glow ring
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI);
		ctx.strokeStyle = 'rgba(139,92,246,0.25)';
		ctx.lineWidth = 4;
		ctx.stroke();

		// Center hub
		const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 48);
		grad.addColorStop(0, '#1e1e2e');
		grad.addColorStop(1, '#0e0e18');
		ctx.beginPath();
		ctx.arc(centerX, centerY, 48, 0, 2 * Math.PI);
		ctx.fillStyle = grad;
		ctx.fill();
		ctx.strokeStyle = 'rgba(139,92,246,0.4)';
		ctx.lineWidth = 3;
		ctx.stroke();
	}

	// --- Spin ---
	function toggleSpin() {
		if (names.length < 2) return;
		initAudio();
		if (!isSpinning) startSpin();
		else if (!isStopping) stopSpin();
	}

	function startSpin() {
		isSpinning = true;
		isStopping = false;
		lastTickAngle = rotation;

		function animate() {
			if (!isSpinning || isStopping) return;
			rotation += 0.15;
			rotation %= 2 * Math.PI;

			const seg = (2 * Math.PI) / names.length;
			if (Math.abs(rotation - lastTickAngle) >= seg) {
				playTick();
				lastTickAngle = rotation;
			}

			drawWheel();
			animationId = requestAnimationFrame(animate);
		}
		animate();
	}

	function resetZoom() {
		if (wheelRingEl) {
			wheelRingEl.style.transition = 'transform 0.6s ease-out';
			wheelRingEl.style.transform = 'scale(1) translateY(0)';
			setTimeout(() => { if (wheelRingEl) wheelRingEl.style.transition = ''; }, 700);
		}
	}

	function stopSpin() {
		isStopping = true;
		if (animationId) cancelAnimationFrame(animationId);
		playDrumroll();

		const duration = 9000;
		const start = Date.now();
		const startRot = rotation;
		const winner = Math.floor(Math.random() * names.length);
		winnerIndex = winner;
		const seg = (2 * Math.PI) / names.length;
		const pointer = Math.PI * 1.5;
		const segCenter = winner * seg + seg / 2;
		let target = pointer - segCenter;
		const minRot = startRot + 6 * 2 * Math.PI;
		while (target < minRot) target += 2 * Math.PI;

		let lastTick = startRot;

		function decelerate() {
			const elapsed = Date.now() - start;
			const p = Math.min(elapsed / duration, 1);

			if (p < 1) {
				// Power-of-5 easing: crawls extremely slowly in the last 20%
				const ease = 1 - Math.pow(1 - p, 5);
				rotation = startRot + (target - startRot) * ease;

				if (Math.abs(rotation - lastTick) >= seg) {
					playTick();
					lastTick = rotation;
				}

				// Suspense zoom: starts at p=0.4, reaches max exactly at p=1.0
				if (wheelRingEl && p > 0.4) {
					const zp = (p - 0.4) / 0.6; // 0→1 mapped to p=0.4→1.0
					const easeZoom = zp * zp; // quadratic ease-in for dramatic final zoom
					const scale = 1 + easeZoom * 1.2; // 1.0 → 2.2
					const ty = easeZoom * 60; // push down to keep pointer area in frame
					wheelRingEl.style.transform = `scale(${scale}) translateY(${ty}px)`;
				}

				drawWheel();
				requestAnimationFrame(decelerate);
			} else {
				rotation = target;
				drawWheel();
				isSpinning = false;
				isStopping = false;
				triggerWinner(names[winner]);
			}
		}
		decelerate();
	}

	function triggerWinner(name) {
		winnerName = name;
		showWinnerScreen = true;
		playVictorySound();
		launchFullScreenConfetti();
		loadLottie();
		resetZoom();
	}

	function dismissWinner() {
		showWinnerScreen = false;
		stopConfetti();
		if (lottieAnim) { lottieAnim.destroy(); lottieAnim = null; }
		if (winnerIndex !== null && winnerIndex < names.length) {
			names = names.filter((_, i) => i !== winnerIndex);
			fullNames = fullNames.filter((_, i) => i !== winnerIndex);
			winnerIndex = null;
			drawWheel();
		}
	}

	// --- Full-screen confetti ---
	function launchFullScreenConfetti() {
		if (!fullConfettiEl) return;
		fullConfettiEl.innerHTML = '';

		function burst() {
			for (let i = 0; i < 40; i++) {
				const el = document.createElement('div');
				const size = 5 + Math.random() * 10;
				const isStrip = Math.random() > 0.4;
				const w = isStrip ? 4 + Math.random() * 4 : size;
				const h = isStrip ? 12 + Math.random() * 20 : size;
				const left = Math.random() * 100;
				const delay = Math.random() * 0.6;
				const dur = 2.5 + Math.random() * 3;
				const drift = (Math.random() - 0.5) * 200;
				const col = confettiColors[Math.floor(Math.random() * confettiColors.length)];
				el.style.cssText = `
					position:absolute; width:${w}px; height:${h}px;
					background:${col}; left:${left}%; top:-20px;
					opacity:${0.7 + Math.random() * 0.3};
					border-radius:${isStrip ? '2px' : '50%'};
					animation: confettiRain ${dur}s linear ${delay}s forwards;
					--drift: ${drift}px;
				`;
				fullConfettiEl.appendChild(el);
			}
		}

		burst();
		confettiInterval = setInterval(() => {
			if (fullConfettiEl.children.length > 300) {
				const toRemove = fullConfettiEl.children.length - 200;
				for (let i = 0; i < toRemove; i++) fullConfettiEl.children[0]?.remove();
			}
			burst();
		}, 1200);
	}

	function stopConfetti() {
		if (confettiInterval) { clearInterval(confettiInterval); confettiInterval = null; }
		if (fullConfettiEl) fullConfettiEl.innerHTML = '';
	}

	async function loadLottie() {
		try {
			const lottie = await import('lottie-web');
			if (lottieContainer && !lottieAnim) {
				lottieAnim = lottie.default.loadAnimation({
					container: lottieContainer,
					renderer: 'svg',
					loop: true,
					autoplay: true,
					path: 'https://assets5.lottiefiles.com/packages/lf20_rovf9gzu.json'
				});
			}
		} catch (e) {}
	}

	// --- Participants ---
	function addSingleName() {
		const n = nameInput.trim();
		if (n) { names = [...names, n]; fullNames = [...fullNames, n]; nameInput = ''; drawWheel(); }
	}

	function addBulkNames() {
		const t = bulkInput.trim();
		if (t) {
			const newNames = t.split('\n').map(s => s.trim()).filter(Boolean);
			names = [...names, ...newNames];
			fullNames = [...fullNames, ...newNames];
			bulkInput = '';
			drawWheel();
		}
	}

	function removeName(i) { names = names.filter((_, idx) => idx !== i); fullNames = fullNames.filter((_, idx) => idx !== i); drawWheel(); }

	function clearAllNames() { names = []; fullNames = []; rotation = 0; drawWheel(); }

	async function loadFromAPI() {
		try {
			apiLoading = true;
			apiStatus = 'Cargando...';
			apiStatusType = 'loading';
			const data = await apiFetch('/usuarios-asistentes?tipo=trabajadores');
			const usuarios = data.usuarios || [];
			if (usuarios.length > 0) {
				names = usuarios.map(u => u.nombre).filter(Boolean);
				fullNames = [...names];
				rotation = 0;
				drawWheel();
				apiStatus = `${names.length} cargados`;
				apiStatusType = 'success';
			} else {
				apiStatus = 'Sin registros';
				apiStatusType = 'error';
			}
		} catch (e) {
			apiStatus = `Error: ${e.message}`;
			apiStatusType = 'error';
		} finally { apiLoading = false; }
	}

	onMount(async () => {
		ctx = canvas.getContext('2d');
		drawWheel();
		// Auto-load from API on mount
		await loadFromAPI();
		loadingScreen = false;
	});

	onDestroy(() => {
		if (animationId) cancelAnimationFrame(animationId);
		if (lottieAnim) lottieAnim.destroy();
		stopConfetti();
	});

	let spinBtnText = $derived(isStopping ? 'FRENANDO...' : isSpinning ? 'DETENER' : 'GIRAR');
	let spinDisabled = $derived(names.length < 2 || isStopping);
</script>

<div class="fullscreen-ruleta">
	<!-- Subtle background particles -->
	<div class="bg-glow bg-glow-1"></div>
	<div class="bg-glow bg-glow-2"></div>

	<!-- Full-screen confetti layer -->
	<div class="fullscreen-confetti" bind:this={fullConfettiEl}></div>

	<!-- Top bar: logo + participant count + dev toggle -->
	<div class="top-bar">
		<a href="{base}/" class="back-link" aria-label="Volver al panel">
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="15 18 9 12 15 6"/>
			</svg>
			<span>Panel</span>
		</a>
		<div class="top-center">
			<span class="top-title">Ruleta de Premios</span>
			{#if names.length > 0}
				<span class="top-count">{names.length} participantes</span>
			{/if}
		</div>
		<button class="dev-toggle" onclick={() => devPanelOpen = !devPanelOpen} aria-label="Panel de desarrollo">
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
				<circle cx="12" cy="12" r="3"/>
			</svg>
		</button>
	</div>

	<!-- Retractable dev panel (slide from right) -->
	{#if devPanelOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="dev-backdrop" onclick={() => devPanelOpen = false}></div>
		<aside class="dev-panel">
			<div class="dev-panel-header">
				<h3>Dev: Participantes</h3>
				<button class="dev-close" onclick={() => devPanelOpen = false} aria-label="Cerrar">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>

			<div class="dev-section">
				<button class="dev-btn-api" onclick={loadFromAPI} disabled={apiLoading}>
					{apiLoading ? 'Cargando...' : 'Recargar desde API'}
				</button>
				{#if apiStatus}
					<span class="dev-api-status {apiStatusType}">{apiStatus}</span>
				{/if}
			</div>

			<div class="dev-section">
				<div class="dev-input-row">
					<input type="text" class="dev-input" placeholder="Nombre..." bind:value={nameInput} onkeypress={(e) => e.key === 'Enter' && addSingleName()} />
					<button class="dev-btn-add" onclick={addSingleName}>+</button>
				</div>
			</div>

			<div class="dev-section">
				<label class="dev-label" for="devBulkInput">Agregar varios:</label>
				<textarea id="devBulkInput" class="dev-textarea" placeholder={"Juan\nMaría\nPedro"} rows="3" bind:value={bulkInput}></textarea>
				<button class="dev-btn" onclick={addBulkNames}>Agregar Todos</button>
			</div>

			<div class="dev-section">
				<div class="dev-list-header">
					<span>Lista ({names.length})</span>
					{#if names.length > 0}
						<button class="dev-btn-clear" onclick={clearAllNames}>Limpiar</button>
					{/if}
				</div>
				<div class="dev-names-list">
					{#each names as name, i}
						<div class="dev-name-row">
							<span class="dev-name-idx">{i+1}</span>
							<span class="dev-name-txt" title={name}>{formatNameShort(name)}</span>
							<button class="dev-name-del" onclick={() => removeName(i)} aria-label="Eliminar">x</button>
						</div>
					{/each}
				</div>
			</div>
		</aside>
	{/if}

	<!-- Main wheel area -->
	<div class="wheel-stage">
		<div class="wheel-wrapper" bind:this={wheelRingEl}>
			<div class="pointer-arrow">
				<svg width="44" height="50" viewBox="0 0 44 50">
					<defs>
						<filter id="pointerShadow" x="-20%" y="-20%" width="140%" height="140%">
							<feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#ffc600" flood-opacity="0.6"/>
						</filter>
					</defs>
					<polygon points="22,48 6,6 38,6" fill="#ffc600" stroke="#0a0a0f" stroke-width="2" filter="url(#pointerShadow)"/>
				</svg>
			</div>
			<div class="wheel-ring">
				<canvas bind:this={canvas} width="800" height="800"></canvas>
			</div>
			<button
				class="spin-btn-center"
				class:spinning={isSpinning && !isStopping}
				class:stopping={isStopping}
				onclick={toggleSpin}
				disabled={spinDisabled}
			>
				{spinBtnText}
			</button>
		</div>
	</div>
</div>

<!-- WINNER: Full-screen overlay -->
{#if showWinnerScreen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="winner-fullscreen" onclick={(e) => { if (e.target === e.currentTarget) dismissWinner(); }}>
		<div class="lottie-bg" bind:this={lottieContainer}></div>
		<div class="winner-card">
			<div class="winner-trophy">
				<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ffc600" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
					<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
					<path d="M4 22h16"/>
					<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
					<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
					<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
				</svg>
			</div>
			<p class="winner-label">GANADOR</p>
			<h1 class="winner-name">{formatNameFull(winnerName)}</h1>
			<div class="winner-buttons">
				<button class="w-btn w-btn-primary" onclick={dismissWinner}>Continuar Sorteo</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* ===== FULL-SCREEN LAYOUT ===== */
	.fullscreen-ruleta {
		position: fixed;
		inset: 0;
		background: #06060c;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		font-family: 'Inter', system-ui, -apple-system, sans-serif;
	}

	.bg-glow {
		position: absolute;
		border-radius: 50%;
		filter: blur(120px);
		pointer-events: none;
		z-index: 0;
	}
	.bg-glow-1 {
		width: 500px; height: 500px;
		top: -150px; left: -100px;
		background: rgba(139, 92, 246, 0.08);
	}
	.bg-glow-2 {
		width: 400px; height: 400px;
		bottom: -100px; right: -80px;
		background: rgba(255, 198, 0, 0.06);
	}

	.fullscreen-confetti {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 900;
		overflow: hidden;
	}

	/* ===== TOP BAR ===== */
	.top-bar {
		position: relative;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.25rem;
		flex-shrink: 0;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		color: rgba(255,255,255,0.5);
		text-decoration: none;
		font-size: 0.8rem;
		font-weight: 500;
		transition: color 0.2s;
	}
	.back-link:hover { color: rgba(255,255,255,0.8); }

	.top-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
	}
	.top-title {
		font-size: 0.9rem;
		font-weight: 700;
		color: rgba(255,255,255,0.85);
		letter-spacing: 0.02em;
	}
	.top-count {
		font-size: 0.65rem;
		color: rgba(255,255,255,0.35);
		font-weight: 500;
	}

	.dev-toggle {
		background: rgba(255,255,255,0.06);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 8px;
		color: rgba(255,255,255,0.4);
		width: 36px; height: 36px;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}
	.dev-toggle:hover {
		color: rgba(255,255,255,0.7);
		border-color: rgba(139,92,246,0.3);
		background: rgba(139,92,246,0.1);
	}

	/* ===== DEV PANEL ===== */
	.dev-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.5);
		z-index: 500;
		animation: fadeIn 0.2s ease;
	}

	.dev-panel {
		position: fixed;
		top: 0; right: 0; bottom: 0;
		width: 320px;
		max-width: 85vw;
		background: #0e0e18;
		border-left: 1px solid rgba(255,255,255,0.06);
		z-index: 501;
		display: flex;
		flex-direction: column;
		animation: slideInRight 0.25s ease;
		overflow-y: auto;
	}

	.dev-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255,255,255,0.06);
	}
	.dev-panel-header h3 {
		font-size: 0.9rem;
		font-weight: 600;
		color: rgba(255,255,255,0.8);
	}

	.dev-close {
		background: none; border: none;
		color: rgba(255,255,255,0.4);
		cursor: pointer;
		padding: 4px;
	}
	.dev-close:hover { color: white; }

	.dev-section {
		padding: 0.75rem 1.25rem;
		border-bottom: 1px solid rgba(255,255,255,0.04);
	}

	.dev-btn-api {
		width: 100%;
		padding: 0.6rem;
		background: linear-gradient(135deg, #8b5cf6, #3b82f6);
		color: white; border: none;
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		margin-bottom: 0.5rem;
	}
	.dev-btn-api:disabled { opacity: 0.5; cursor: not-allowed; }

	.dev-api-status {
		display: block;
		font-size: 0.7rem;
		font-weight: 600;
	}
	.dev-api-status.loading { color: #3b82f6; }
	.dev-api-status.success { color: #10b981; }
	.dev-api-status.error { color: #ef4444; }

	.dev-input-row { display: flex; gap: 0.4rem; }
	.dev-input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 6px;
		color: white;
		font-family: inherit;
		font-size: 0.8rem;
	}
	.dev-input:focus { outline: none; border-color: rgba(139,92,246,0.5); }
	.dev-input::placeholder { color: rgba(255,255,255,0.25); }

	.dev-btn-add {
		width: 36px; height: 36px;
		background: #8b5cf6; color: white;
		border: none; border-radius: 6px;
		font-size: 1.1rem; font-weight: 700;
		cursor: pointer;
	}

	.dev-label {
		display: block;
		font-size: 0.7rem;
		color: rgba(255,255,255,0.35);
		margin-bottom: 0.4rem;
	}
	.dev-textarea {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 6px;
		color: white;
		font-family: inherit;
		font-size: 0.8rem;
		resize: vertical;
		min-height: 60px;
		margin-bottom: 0.5rem;
	}
	.dev-textarea:focus { outline: none; border-color: rgba(139,92,246,0.5); }
	.dev-textarea::placeholder { color: rgba(255,255,255,0.25); }

	.dev-btn {
		width: 100%;
		padding: 0.5rem;
		background: rgba(255,255,255,0.06);
		color: rgba(255,255,255,0.7);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 6px;
		font-family: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}
	.dev-btn:hover { background: rgba(255,255,255,0.1); }

	.dev-list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		font-size: 0.75rem;
		color: rgba(255,255,255,0.5);
		font-weight: 600;
	}
	.dev-btn-clear {
		background: none; border: none;
		color: #ef4444;
		font-size: 0.7rem;
		font-weight: 600;
		cursor: pointer;
	}

	.dev-names-list {
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid rgba(255,255,255,0.04);
		border-radius: 6px;
	}
	.dev-names-list::-webkit-scrollbar { width: 4px; }
	.dev-names-list::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 2px; }

	.dev-name-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.6rem;
		border-bottom: 1px solid rgba(255,255,255,0.03);
		font-size: 0.75rem;
	}
	.dev-name-row:last-child { border-bottom: none; }
	.dev-name-idx {
		color: rgba(255,255,255,0.2);
		font-family: monospace;
		font-size: 0.65rem;
		min-width: 18px;
	}
	.dev-name-txt {
		flex: 1;
		color: rgba(255,255,255,0.7);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.dev-name-del {
		background: none; border: none;
		color: rgba(239,68,68,0.6);
		cursor: pointer;
		font-size: 0.7rem;
		padding: 2px 4px;
	}
	.dev-name-del:hover { color: #ef4444; }

	/* ===== WHEEL STAGE ===== */
	.wheel-stage {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		z-index: 1;
		overflow: hidden;
	}

	.wheel-wrapper {
		position: relative;
		display: inline-block;
		transform-origin: 50% 0%;
		will-change: transform;
	}

	.pointer-arrow {
		position: absolute;
		top: -36px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		animation: pointerBob 2s ease-in-out infinite;
	}

	.wheel-ring {
		border-radius: 50%;
		box-shadow:
			0 0 0 6px rgba(255,255,255,0.03),
			0 0 0 10px rgba(139,92,246,0.2),
			0 0 60px rgba(139,92,246,0.1),
			0 0 120px rgba(139,92,246,0.05);
		overflow: hidden;
		line-height: 0;
	}

	.wheel-ring canvas {
		border-radius: 50%;
		width: min(75vh, 75vw, 560px);
		height: min(75vh, 75vw, 560px);
	}

	.spin-btn-center {
		position: absolute;
		top: 50%; left: 50%;
		transform: translate(-50%, -50%);
		width: 88px; height: 88px;
		border-radius: 50%;
		background: radial-gradient(circle at 30% 30%, #1a1a2e, #0a0a14);
		color: white;
		border: 3px solid rgba(139,92,246,0.35);
		font-size: 0.7rem;
		font-weight: 800;
		font-family: inherit;
		letter-spacing: 0.1em;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 25px rgba(139,92,246,0.2), inset 0 0 20px rgba(0,0,0,0.5);
		transition: all 0.3s ease;
		z-index: 50;
	}

	.spin-btn-center:not(:disabled):hover {
		transform: translate(-50%, -50%) scale(1.06);
		border-color: rgba(139,92,246,0.6);
		box-shadow: 0 0 40px rgba(139,92,246,0.35), inset 0 0 20px rgba(0,0,0,0.5);
	}
	.spin-btn-center:disabled { opacity: 0.3; cursor: not-allowed; }
	.spin-btn-center.spinning {
		border-color: rgba(255,198,0,0.5);
		box-shadow: 0 0 30px rgba(255,198,0,0.3), inset 0 0 20px rgba(0,0,0,0.5);
		animation: centerPulse 0.8s ease infinite;
	}
	.spin-btn-center.stopping {
		border-color: rgba(245,158,11,0.4);
		opacity: 0.6;
	}

	/* ===== WINNER FULL-SCREEN ===== */
	.winner-fullscreen {
		position: fixed;
		inset: 0;
		background: rgba(6,6,12,0.92);
		backdrop-filter: blur(20px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn 0.4s ease;
	}

	.lottie-bg {
		position: absolute;
		inset: -10%;
		pointer-events: none;
		z-index: 0;
		opacity: 0.4;
	}

	.winner-card {
		position: relative;
		z-index: 1;
		text-align: center;
		padding: 3rem 2.5rem;
		max-width: 480px;
		width: 90%;
		animation: winnerReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.winner-trophy {
		margin-bottom: 1.5rem;
		animation: trophyFloat 2.5s ease-in-out infinite;
	}

	.winner-label {
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.3em;
		color: rgba(255,255,255,0.35);
		margin-bottom: 1rem;
	}

	.winner-name {
		font-size: clamp(2rem, 6vw, 3.5rem);
		font-weight: 800;
		line-height: 1.2;
		margin-bottom: 2.5rem;
		background: linear-gradient(135deg, #ffc600, #8b5cf6, #3b82f6);
		background-size: 200% 200%;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: gradientShift 3s ease infinite;
	}

	.winner-buttons { display: flex; justify-content: center; }

	.w-btn {
		padding: 0.85rem 2.5rem;
		border: none;
		border-radius: 12px;
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.w-btn-primary {
		background: linear-gradient(135deg, #8b5cf6, #3b82f6);
		color: white;
		box-shadow: 0 4px 20px rgba(139,92,246,0.4);
	}
	.w-btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 30px rgba(139,92,246,0.5);
	}

	/* ===== ANIMATIONS ===== */
	@keyframes fadeIn {
		from { opacity: 0; } to { opacity: 1; }
	}
	@keyframes slideInRight {
		from { transform: translateX(100%); } to { transform: translateX(0); }
	}
	@keyframes pointerBob {
		0%, 100% { transform: translateX(-50%) translateY(0); }
		50% { transform: translateX(-50%) translateY(8px); }
	}
	@keyframes centerPulse {
		0%, 100% { box-shadow: 0 0 25px rgba(255,198,0,0.2), inset 0 0 20px rgba(0,0,0,0.5); }
		50% { box-shadow: 0 0 45px rgba(255,198,0,0.45), inset 0 0 20px rgba(0,0,0,0.5); }
	}
	@keyframes trophyFloat {
		0%, 100% { transform: translateY(0) scale(1); }
		50% { transform: translateY(-10px) scale(1.03); }
	}
	@keyframes winnerReveal {
		from { opacity: 0; transform: translateY(40px) scale(0.9); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}
	@keyframes gradientShift {
		0%, 100% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
	}
	@keyframes confettiRain {
		0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
		100% { transform: translateY(110vh) translateX(var(--drift, 0px)) rotate(720deg); opacity: 0; }
	}

	/* ===== RESPONSIVE ===== */
	@media (max-width: 500px) {
		.wheel-ring canvas {
			width: min(80vw, 85vh, 380px);
			height: min(80vw, 85vh, 380px);
		}
		.spin-btn-center { width: 68px; height: 68px; font-size: 0.6rem; }
		.pointer-arrow { top: -28px; }
		.pointer-arrow svg { width: 36px; height: 42px; }
		.winner-card { padding: 2rem 1.5rem; }
	}

	@media (max-height: 700px) {
		.wheel-ring canvas {
			width: min(60vh, 75vw, 420px);
			height: min(60vh, 75vw, 420px);
		}
		.spin-btn-center { width: 70px; height: 70px; }
	}
</style>
