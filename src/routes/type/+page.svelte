<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import Keyboard from '$lib/Keyboard.svelte';
	import { keyboardLayout } from '../../lib/keyboardLayout.ts';
	import { loadSound, unlockAudio, playSound } from '../../lib/sound.ts';

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

	$: (typed, updateCentering());

	onMount(() => {
		if (!browser) return;

		loadSound('/key.wav');

		window.addEventListener('keydown', onHardwareKeyDown, { passive: false });
		window.addEventListener('keyup', onHardwareKeyUp);

		if (fieldEl && 'ResizeObserver' in window) {
			ro = new ResizeObserver(updateCentering);
			ro.observe(fieldEl);
		}
	});

	onDestroy(() => {
		if (!browser) return;

		window.removeEventListener('keydown', onHardwareKeyDown as any);
		window.removeEventListener('keyup', onHardwareKeyUp as any);

		ro?.disconnect();
		ro = null;
	});
</script>

<div class="min-h-screen p-6 text-zinc-100">
	<div class="absolute inset-0 overflow-hidden bg-slate-800">
		<div
			class="absolute inset-0 transition"
			style="background: conic-gradient(from 230.29deg at 51.63% 52.16%, rgb(51, 58, 255) 0deg, rgb(127, 28, 166) 67.5deg, rgb(64, 85, 191) 198.75deg, rgb(255, 78, 51) 251.25deg, rgb(207, 122, 250) 301.88deg, rgb(255, 255, 255) 360deg); filter: blur(30px); transform: scale(1.385);"
		></div>
		<div
			class="absolute inset-0 bg-cover opacity-0 transition-opacity"
			style="background-image: none; mix-blend-mode: normal;"
		></div>
	</div>
	<div class="mx-auto mb-6 max-w-4xl">
		<div
			bind:this={fieldEl}
			class="relative flex items-center rounded-lg border border-white/10 bg-[rgba(20,20,20,0.15)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_26px_rgba(0,0,0,0.35)] backdrop-blur-[10px]"
		>
			<div class="relative w-full overflow-hidden">
				<span
					bind:this={textEl}
					class="animate-gradient inline-block bg-[linear-gradient(to_right,var(--color-indigo-400),var(--color-indigo-100),var(--color-sky-400),var(--color-fuchsia-400),var(--color-sky-400),var(--color-indigo-100),var(--color-indigo-400))] bg-size-[200%_auto] bg-clip-text py-[0.15em] text-[clamp(1.7rem,4.5vw,3.8rem)] leading-[1.35] font-extrabold whitespace-pre text-transparent will-change-transform"
					style={`transform: translateX(${textShiftPx}px);`}
				>
					{typed || 'type something...'}
				</span>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-5xl">
		<div
			class="backdrop-blur-[10px]"
		>
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
