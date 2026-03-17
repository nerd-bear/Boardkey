<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import Keyboard from '$lib/Keyboard.svelte';
	import { keyboardLayout } from '../../lib/keyboardLayout.ts';
	import { loadSound, unlockAudio, playSound } from '../../lib/sound.ts';
	import Button from '$lib/components/Button.svelte';
	import { AmbientSoundPlayer, type AmbientSoundConfig } from '$lib/audio/ambientSoundPlayer';

	// --- UI state ---
	let pressed = new Set<string>();
	let wrongKeys = new Set<string>();
	let audioUnlocked = false;

	let typed = '';

	let fieldEl: HTMLDivElement | null = null;
	let textEl: HTMLSpanElement | null = null;
	let textShiftPx = 0;

	let shiftLeftHeld = false;
	let shiftRightHeld = false;
	$: shiftHeld = shiftLeftHeld || shiftRightHeld;

	let ro: ResizeObserver | null = null;
	let lastTrigger: HTMLElement | null = null;
	let showSettings = false;
	let settingsModal: HTMLElement | null = null;

	// --- Fonts ---
	let selectedFont = 'Hubballi';
	const fonts = [
		{ name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
		{ name: 'Fira Code', value: "'Fira Code', monospace" },
		{ name: 'Space Mono', value: "'Space Mono', monospace" },
		{ name: 'Hubballi', value: "'Hubballi', sans-serif" },
		{ name: 'Minecraft', value: "'Minecraft', monospace" },
	];
	$: activeFont = fonts.find(f => f.name === selectedFont)?.value;

	// --- Ambient music ---
	let music = false;
	let musicVolume = 50;
	let player: AmbientSoundPlayer | null = null;
	let ambientLoaded = false;
	let ambientLoading = true;
	let ambientError = '';

	async function loadAmbientConfig(url: string): Promise<AmbientSoundConfig> {
		const res = await fetch(url);
		return await res.json();
	}

	// --- Keyboard helpers ---
	function normalizeHardwareKey(e: KeyboardEvent): string {
		if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') return 'Shift';

		if (e.key === ' ') return ' ';
		if (e.key === 'Backspace') return 'Backspace';
		if (e.key === 'Tab') return 'Tab';
		if (e.key === 'Enter') return 'Enter';
		if (e.key === 'Shift') return 'Shift';
		if (e.key === 'Control') return 'Control';
		if (e.key === 'Alt') return 'Alt';
		if (e.key === 'CapsLock') return 'CapsLock';

		if (e.key.length === 1) return e.key.toUpperCase();
		return e.key;
	}

	function down(code: string) {
		pressed.add(code);
		pressed = new Set(pressed);
	}

	function up(code: string) {
		pressed.delete(code);
		pressed = new Set(pressed);
	}

	function applyVirtualKey(code: string) {
		if (code === 'Shift' || code === 'Control' || code === 'Alt' || code === 'CapsLock') return;

		if (code === 'Backspace') {
			typed = typed.slice(0, -1);
			return;
		}

		if (code === 'Enter') return;

		if (code === ' ') {
			typed += ' ';
			return;
		}

		if (code.length === 1) {
			const isLetter = /^[A-Z]$/.test(code);
			if (isLetter) typed += shiftHeld ? code : code.toLowerCase();
			else typed += code;
		}
	}

	async function handleSound() {
		if (!audioUnlocked) {
			audioUnlocked = true;
			await unlockAudio();
		}
		playSound();
	}

	async function onHardwareKeyDown(e: KeyboardEvent) {
		if (e.repeat) return;

		if (e.key === 'Tab') e.preventDefault();

		if (e.code === 'ShiftLeft') shiftLeftHeld = true;
		if (e.code === 'ShiftRight') shiftRightHeld = true;

		const code = normalizeHardwareKey(e);

		down(code);
		await handleSound();
		applyVirtualKey(code);
	}

	function onHardwareKeyUp(e: KeyboardEvent) {
		if (e.code === 'ShiftLeft') shiftLeftHeld = false;
		if (e.code === 'ShiftRight') shiftRightHeld = false;

		const code = normalizeHardwareKey(e);

		if (code === 'Shift' && (shiftLeftHeld || shiftRightHeld)) return;

		up(code);
	}

	async function updateCentering() {
		await tick();

		if (!fieldEl || !textEl) return;

		const fieldW = fieldEl.clientWidth;
		const textW = textEl.scrollWidth;

		if (!typed.length) {
			textShiftPx = 0;
			return;
		}

		const threshold = fieldW / 2;

		if (textW <= threshold) {
			textShiftPx = 0;
			return;
		}

		const desired = -(textW - fieldW / 2);
		textShiftPx = Math.min(0, desired);
	}

	// Update centering when typed text or font changes
	$: typed, selectedFont, updateCentering();

	// --- Ambient music handlers ---
	async function handleMusicToggle(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		if (!target.checked) {
			player?.stop();
			music = false;
			return;
		}

		try {
			await player?.start();
			music = true;
			ambientError = '';
		} catch (e) {
			music = false;
			target.checked = false;
			ambientError = 'Could not start music.';
		}
	}

	function handleMusicVolumeInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		musicVolume = Number(target.value);
		player?.setMasterVolume(musicVolume / 100);
	}

	// --- Lifecycle ---
	onMount(() => {
		if (!browser) return;

		loadSound('/key.wav');

		window.addEventListener('keydown', onHardwareKeyDown, { passive: false });
		window.addEventListener('keyup', onHardwareKeyUp);

		if (fieldEl && 'ResizeObserver' in window) {
			ro = new ResizeObserver(updateCentering);
			ro.observe(fieldEl);
		}

		// Ambient music setup
		player = new AmbientSoundPlayer(musicVolume / 100);
		(async () => {
			try {
				const config = await loadAmbientConfig('/audio/ambient.json');
				await player?.loadConfig(config);
				player?.setMasterVolume(musicVolume / 100);
				ambientLoaded = true;
				ambientLoading = false;
			} catch (e) {
				ambientError = 'Music failed to load.';
				ambientLoading = false;
			}
		})();
	});

	onDestroy(() => {
		if (!browser) return;

		window.removeEventListener('keydown', onHardwareKeyDown as any);
		window.removeEventListener('keyup', onHardwareKeyUp as any);

		ro?.disconnect();
		ro = null;

		player?.destroy();
		player = null;
	});

	// --- Modal handlers ---
	async function openSettings(event?: MouseEvent) {
		lastTrigger =
			(event?.currentTarget as HTMLElement) ??
			(document.activeElement as HTMLElement | null);
		showSettings = true;
		await tick();
		settingsModal?.focus();
	}

	function closeSettings() {
		showSettings = false;
		lastTrigger?.focus();
	}
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono&family=Fira+Code&family=Space+Mono&family=Hubballi&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="min-h-screen p-6 text-zinc-100" style={`font-family: ${activeFont};`}>
	{#if showSettings}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
			<button
				type="button"
				class="modal-backdrop absolute inset-0 cursor-default"
				on:click={closeSettings}
				aria-label="Close settings dialog"
			></button>

			<div
				id="settings-dialog"
				bind:this={settingsModal}
				class="modal-card relative w-full max-w-lg rounded-2xl p-6 text-left"
				role="dialog"
				aria-modal="true"
				aria-labelledby="settings-title"
				aria-describedby="settings-description"
				tabindex="-1"
			>
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 id="settings-title" class="text-3xl leading-none">Settings</h2>
						<p id="settings-description" class="mt-2 text-white/70">
							Customize your typing experience
						</p>
					</div>

					<button
						type="button"
						on:click={closeSettings}
						class="rounded-lg border border-white/20 bg-white/10 px-3 py-2 shadow-[0_4px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:translate-y-px hover:bg-white/15 hover:shadow-[0_3px_0_rgba(0,0,0,0.35)] active:translate-y-1 active:shadow-[0_0px_0_rgba(0,0,0,0.35)]"
						aria-label="Close settings"
					>
						✕
					</button>
				</div>

				<div class="mt-6 space-y-4">
					<!-- Font selector -->
					<div class="flex items-center justify-between gap-4">
						<div>
							<div class="text-xl">Font</div>
							<div class="text-white/70">Choose typing font</div>
						</div>
						<select
							bind:value={selectedFont}
							class="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white shadow-[0_4px_0_rgba(0,0,0,0.35)] outline-none"
						>
							{#each fonts as font}
								<option value={font.name} class="bg-zinc-800">{font.name}</option>
							{/each}
						</select>
					</div>

					<!-- Ambient music toggle -->
					<div class="flex items-center justify-between gap-4">
						<div>
							<div class="text-xl">Ambient Music</div>
							<div class="text-white/70">Background typing music</div>
						</div>
						<label class="relative inline-block h-7 w-12 cursor-pointer">
							<input
								class="peer hidden sr-only"
								type="checkbox"
								checked={music}
								on:change={handleMusicToggle}
							/>
						
							<span
								class="absolute inset-0 rounded-full border border-white/20 bg-white/10 transition-colors peer-checked:bg-indigo-500/50"
							></span>
							<span
								class="absolute left-1 top-1 h-5 w-5 rounded-full border border-white/20 bg-white shadow-[0_2px_0_rgba(0,0,0,0.35)] transition-all peer-checked:translate-x-5"
							></span>
						</label>
					</div>

					<!-- Volume slider -->
					<div class="flex items-center gap-4">
						<span class="w-16 text-white/70">Volume</span>
						<input
							type="range"
							min="0"
							max="100"
							bind:value={musicVolume}
							on:input={handleMusicVolumeInput}
							class="slider flex-1"
							aria-label="Music volume"
						/>
						<span class="w-12 text-right text-white/70">{musicVolume}%</span>
					</div>

					{#if ambientError}
						<div class="text-sm text-red-300">{ambientError}</div>
					{/if}
				</div>

				<div class="mt-6 flex justify-end">
					<button
						type="button"
						on:click={closeSettings}
						class="h-12 rounded-lg border border-white/20 bg-white/10 px-5 text-lg shadow-[0_4px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:translate-y-px hover:bg-white/15 hover:shadow-[0_3px_0_rgba(0,0,0,0.35)] active:translate-y-1 active:shadow-[0_0px_0_rgba(0,0,0,0.35)]"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	{/if}

	<div class="absolute inset-0 overflow-hidden bg-slate-800">
		<div
			class="absolute inset-0 transition"
			style="background: conic-gradient(from 230deg at 50% 50%, #333aff, #7f1ca6, #4055bf, #ff4e33, #cf7afa, #ffffff); filter: blur(30px); transform: scale(1.4);"
		></div>
	</div>

	<div class="mx-auto mb-6 max-w-4xl">
		<div class="flex items-start gap-3">
			<!-- typing box with min-w-0 to prevent flex expansion -->
			<div
				bind:this={fieldEl}
				class="relative flex flex-1 min-w-0 items-center rounded-lg border border-white/10 bg-[rgba(20,20,20,0.15)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_26px_rgba(0,0,0,0.35)] backdrop-blur-[10px]"
			>
				<div class="relative w-full overflow-hidden">
					<span
						bind:this={textEl}
						class="animate-gradient inline-block bg-[linear-gradient(to_right,var(--color-indigo-400),var(--color-indigo-100),var(--color-sky-400),var(--color-fuchsia-400))] bg-size-[200%_auto] bg-clip-text py-[0.15em] text-[clamp(1.7rem,4.5vw,3.8rem)] leading-[1.35] font-extrabold whitespace-pre text-transparent will-change-transform"
						style={`transform: translateX(${textShiftPx}px);`}
					>
						{typed || 'type something...'}
					</span>
				</div>
			</div>

			<!-- settings button -->
			<button
				type="button"
				on:click={openSettings}
				class="button-reset scale-90"
				aria-haspopup="dialog"
				aria-expanded={showSettings}
				aria-controls="settings-dialog"
			>
				<span aria-hidden="true">
					<Button contentString="Settings" />
				</span>
				<span class="sr-only">Open settings</span>
			</button>
		</div>
	</div>

	<div class="mx-auto max-w-5xl">
		<div class="backdrop-blur-[10px]">
			<Keyboard
				keyboard={keyboardLayout}
				size="md"
				{pressed}
				{wrongKeys}
				onSound={handleSound}
				on:down={(e) => down(e.detail.code)}
				on:up={(e) => up(e.detail.code)}
				on:press={(e) => applyVirtualKey(e.detail.code)}
			/>
		</div>
	</div>
</div>

<style>
	@font-face { font-family: Minecraft; src: url('/font/Minecraft.ttf'); } 
	@font-face { font-family: Minecraft-Bold; font-weight: bold; src: url('/font/Minecraft.ttf');}

	.hubballi {
		font-family:
			'Hubballi',
			system-ui,
			-apple-system,
			Segoe UI,
			Roboto,
			sans-serif;
	}

	.button-reset {
		display: inline-flex;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.main-layout {
		position: relative;
		z-index: 1;
	}

	.extra-panel {
		position: relative;
		z-index: 2;
	}

	.extras-card {
		background: rgba(255, 255, 255, 0.18);
		border: 1px solid rgba(255, 255, 255, 0.28);
		box-shadow:
			0 12px 30px rgba(0, 0, 0, 0.22),
			inset 0 1px 0 rgba(255, 255, 255, 0.12);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
	}

	.fact-card {
		background: linear-gradient(to bottom, rgba(168, 85, 247, 0.95), rgba(147, 51, 234, 0.92));
		border: 1px solid rgba(255, 255, 255, 0.16);
		box-shadow: 0 14px 32px rgba(0, 0, 0, 0.25);
	}

	.info-btn {
		background: rgba(255, 255, 255, 0.14);
		border: 1px solid rgba(255, 255, 255, 0.22);
		box-shadow:
			0 8px 0 rgba(0, 0, 0, 0.28),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			background 150ms ease;
	}

	.info-btn:hover {
		transform: translateY(1px);
		background: rgba(255, 255, 255, 0.18);
		box-shadow:
			0 7px 0 rgba(0, 0, 0, 0.28),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.info-btn:active {
		transform: translateY(4px);
		box-shadow:
			0 2px 0 rgba(0, 0, 0, 0.28),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.leaderboard-btn {
		box-shadow:
			0 6px 0 rgba(0, 0, 0, 0.35),
			inset 0 2px 8px rgba(255, 255, 255, 0.14),
			0 0 24px rgba(255, 211, 92, 0.18);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			filter 150ms ease;
	}

	.leaderboard-btn:hover {
		transform: translateY(1px);
		box-shadow:
			0 5px 0 rgba(0, 0, 0, 0.35),
			inset 0 2px 8px rgba(255, 255, 255, 0.16),
			0 0 28px rgba(255, 211, 92, 0.28);
		filter: brightness(1.03);
	}

	.leaderboard-btn:active {
		transform: translateY(4px);
		box-shadow:
			0 2px 0 rgba(0, 0, 0, 0.35),
			inset 0 2px 8px rgba(255, 255, 255, 0.16);
	}

	.modal-backdrop {
		border: 0;
		padding: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
	}

	.modal-card {
		border: 1px solid rgba(255, 255, 255, 0.22);
		background: rgba(255, 255, 255, 0.14);
		box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
		outline: none;
	}

	@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
		.extras-card,
		.info-btn,
		.leaderboard-btn,
		.modal-card {
			background: rgba(255, 255, 255, 0.24);
		}

		.modal-backdrop {
			background: rgba(0, 0, 0, 0.65);
		}
	}

	.slider {
		-webkit-appearance: none;
		appearance: none;
		height: 12px;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.18);
		border: 1px solid rgba(255, 255, 255, 0.25);
		cursor: pointer;
		box-shadow:
			0 6px 0 rgba(0, 0, 0, 0.35),
			inset 0 2px 10px rgba(255, 255, 255, 0.08);
	}

	.slider::-webkit-slider-runnable-track {
		height: 12px;
		border-radius: 9999px;
		background: linear-gradient(to right, rgba(85, 210, 245, 0.9), rgba(97, 85, 245, 0.9));
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		height: 22px;
		width: 22px;
		border-radius: 10px;
		background: linear-gradient(to bottom, rgba(255, 255, 255, 0.95), rgba(209, 213, 219, 0.95));
		border: 1px solid rgba(0, 0, 0, 0.18);
		box-shadow:
			0 4px 0 rgba(0, 0, 0, 0.35),
			inset 0 2px 4px rgba(255, 255, 255, 0.45);
		margin-top: -5px;
		transition:
			transform 120ms ease,
			box-shadow 120ms ease;
	}

	.slider::-webkit-slider-thumb:hover {
		transform: translateY(1px);
		box-shadow:
			0 3px 0 rgba(0, 0, 0, 0.35),
			inset 0 2px 4px rgba(255, 255, 255, 0.45);
	}

	.slider::-moz-range-track {
		height: 12px;
		border-radius: 9999px;
		background: linear-gradient(to right, rgba(85, 210, 245, 0.9), rgba(97, 85, 245, 0.9));
	}

	.slider::-moz-range-thumb {
		height: 22px;
		width: 22px;
		border-radius: 10px;
		background: linear-gradient(to bottom, rgba(255, 255, 255, 0.95), rgba(209, 213, 219, 0.95));
		border: 1px solid rgba(0, 0, 0, 0.18);
		box-shadow:
			0 4px 0 rgba(0, 0, 0, 0.35),
			inset 0 2px 4px rgba(255, 255, 255, 0.45);
	}

	.slider:disabled {
		filter: grayscale(0.25);
	}
</style>