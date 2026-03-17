<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import Keyboard from '$lib/Keyboard.svelte';
	import { keyboardLayout } from '../../lib/keyboardLayout.ts';
	import Button from '$lib/components/Button.svelte';
	import { settings } from '$lib/stores/settings';
	import { loadSound, playSound, loadNamedSound } from '$lib/audio/soundPlayer';
	import { unlockAudio } from '$lib/audio/audioContext';
	import { AmbientSoundPlayer, type AmbientSoundConfig } from '$lib/audio/ambientSoundPlayer';
	import { createEasterEggWatcher } from '$lib/audio/easterEggs';

	const checkEasterEgg = createEasterEggWatcher();
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
	let showSettings = false;

	let selectedFont = $settings.selectedFont;
	let music = $settings.music;
	let musicVolume = $settings.musicVolume;
	let sfx = $settings.sfx;

	const fonts = [
		{ name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
		{ name: 'Fira Code', value: "'Fira Code', monospace" },
		{ name: 'Space Mono', value: "'Space Mono', monospace" },
		{ name: 'Hubballi', value: "'Hubballi', sans-serif" },
		{ name: 'Minecraft', value: "'Minecraft', monospace" },
	];
	$: activeFont = fonts.find(f => f.name === selectedFont)?.value;

	$: settings.patch({ selectedFont, music, musicVolume, sfx });

	let player: AmbientSoundPlayer | null = null;
	let ambientLoaded = false;
	let ambientLoading = true;
	let ambientError = '';

	let settingsModal: HTMLElement | null = null;
	let lastTrigger: HTMLElement | null = null;

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

	function down(code: string) { pressed.add(code); pressed = new Set(pressed); }
	function up(code: string) { pressed.delete(code); pressed = new Set(pressed); }

	function applyVirtualKey(code: string) {
		if (code === 'Shift' || code === 'Control' || code === 'Alt' || code === 'CapsLock') return;
		if (code === 'Backspace') { typed = typed.slice(0, -1); return; }
		if (code === 'Enter') return;
		if (code === ' ') { typed += ' '; return; }
		if (code.length === 1) {
			const isLetter = /^[A-Z]$/.test(code);
			if (isLetter) typed += shiftHeld ? code : code.toLowerCase();
			else typed += code;
		}
	}

	async function handleSound() {
		if (!audioUnlocked) { audioUnlocked = true; await unlockAudio(); }
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

		if (e.key.length === 1) checkEasterEgg(e.key);
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
		if (!typed.length) { textShiftPx = 0; return; }
		const threshold = fieldW / 2;
		if (textW <= threshold) { textShiftPx = 0; return; }
		const desired = -(textW - fieldW / 2);
		textShiftPx = Math.min(0, desired);
	}

	$: typed, selectedFont, updateCentering();

	async function handleMusicToggle(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		if (!target.checked) { player?.stop(); music = false; return; }
		try { await player?.start(); music = true; ambientError = ''; }
		catch { music = false; target.checked = false; ambientError = 'Could not start music.'; }
	}

	function handleMusicVolumeInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		musicVolume = Number(target.value);
		player?.setMasterVolume(musicVolume / 100);
	}

	onMount(() => {
		if (!browser) return;

		loadSound('/key.wav');

		loadNamedSound('secret', '/audio/secret.wav', 0.8);
		loadNamedSound('hello', '/audio/hello.wav', 1.0);

		window.addEventListener('keydown', onHardwareKeyDown, { passive: false });
		window.addEventListener('keyup', onHardwareKeyUp);
		if (fieldEl && 'ResizeObserver' in window) {
			ro = new ResizeObserver(updateCentering);
			ro.observe(fieldEl);
		}

		player = new AmbientSoundPlayer(musicVolume / 100);
		(async () => {
			try {
				await player?.loadConfigFromUrl('/audio/ambient.json');
				player?.setMasterVolume(musicVolume / 100);
				ambientLoaded = true;
				ambientLoading = false;

				if (music) {
					try { await player?.start(); } catch { music = false; }
				}
			} catch {
				ambientError = 'Music failed to load.';
				ambientLoading = false;
			}
		})();
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('keydown', onHardwareKeyDown as any);
		window.removeEventListener('keyup', onHardwareKeyUp as any);
		ro?.disconnect(); ro = null;
		player?.destroy(); player = null;
	});

	async function openSettings(event?: MouseEvent) {
		lastTrigger = (event?.currentTarget as HTMLElement) ?? (document.activeElement as HTMLElement | null);
		showSettings = true;
		await tick();
		settingsModal?.focus();
	}

	function closeSettings() { showSettings = false; lastTrigger?.focus(); }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
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
          <div class="rounded-xl border border-white/15 bg-white/10 p-4">
            <div class="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
              <div>
                <div class="text-xl">Font</div>
                <div class="text-white/70">Choose typing font</div>
              </div>
              <select
                bind:value={selectedFont}
                class="font-select rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-white shadow-[0_4px_0_rgba(0,0,0,0.35)] outline-none max-sm:w-full"
              >
                {#each fonts as font}
                  <option value={font.name}>{font.name}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="rounded-xl border border-white/15 bg-white/10 p-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <div class="text-xl">Ambient Music</div>
                <div class="text-white/70">Enable background music</div>
              </div>
              <label class="relative inline-flex cursor-pointer items-center">
                <input
                  class="peer sr-only"
                  type="checkbox"
                  checked={music}
                  on:change={handleMusicToggle}
                  aria-label="Toggle music"
                />
                <div
                  class="h-8 w-14 rounded-lg border border-white/30 bg-white/15 shadow-[0_4px_0_rgba(0,0,0,0.35),inset_0_2px_8px_rgba(255,255,255,0.08)] transition-all duration-200 peer-checked:bg-white/20 before:absolute before:top-1 before:left-1 before:h-6 before:w-6 before:rounded-md before:bg-linear-to-b before:from-sky-200 before:to-sky-500 before:shadow-[0_3px_0_rgba(0,0,0,0.35)] before:transition-all before:duration-200 peer-checked:before:translate-x-6 peer-checked:before:from-emerald-200 peer-checked:before:to-emerald-500"
                ></div>
              </label>
            </div>
          </div>

          <div class="rounded-xl border border-white/15 bg-white/10 p-4">
            <div class="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
              <div>
                <div class="text-xl">Music Volume</div>
                <div class="text-white/70">Volume of background music</div>
              </div>
              <div class="flex w-full items-center gap-3 max-sm:flex-col max-sm:items-start">
                <input
                  id="music-volume"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={musicVolume}
                  on:input={handleMusicVolumeInput}
                  disabled={!music}
                  class="slider w-40 disabled:cursor-not-allowed disabled:opacity-50 max-sm:w-full"
                  aria-label="Music volume"
                />
                <span class="w-10 text-right text-white/80 max-sm:w-auto">{musicVolume}%</span>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-white/15 bg-white/10 p-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <div class="text-xl">SFX</div>
                <div class="text-white/70">Enable/Disable sound effects</div>
              </div>
              <label class="relative inline-flex cursor-pointer items-center">
                <input
                  class="peer sr-only"
                  type="checkbox"
                  bind:checked={sfx}
                  aria-label="Toggle sound effects"
                />
                <div
                  class="h-8 w-14 rounded-lg border border-white/30 bg-white/15 shadow-[0_4px_0_rgba(0,0,0,0.35),inset_0_2px_8px_rgba(255,255,255,0.08)] transition-all duration-200 peer-checked:bg-white/20 before:absolute before:top-1 before:left-1 before:h-6 before:w-6 before:rounded-md before:bg-linear-to-b before:from-sky-200 before:to-sky-500 before:shadow-[0_3px_0_rgba(0,0,0,0.35)] before:transition-all before:duration-200 peer-checked:before:translate-x-6 peer-checked:before:from-emerald-200 peer-checked:before:to-emerald-500"
                ></div>
              </label>
            </div>
          </div>

          {#if ambientError}
            <div class="text-sm text-red-300">{ambientError}</div>
          {/if}
        </div>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            on:click={closeSettings}
            class="h-12 rounded-lg border border-white/20 bg-white/10 px-5 text-lg shadow-[0_4px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:translate-y-px hover:bg-white/15 hover:shadow-[0_3px_0_rgba(0,0,0,0.35)] active:translate-y-1 active:shadow-[0_0px_0_rgba(0,0,0,0.35)]"
          >
            Close
          </button>
          <button
            type="button"
            class="h-12 rounded-lg border border-white/25 bg-white/20 px-5 text-lg shadow-[0_4px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:translate-y-px hover:bg-white/25 hover:shadow-[0_3px_0_rgba(0,0,0,0.35)] active:translate-y-1 active:shadow-[0_0px_0_rgba(0,0,0,0.35)]"
          >
            Save (later)
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
      <div
        bind:this={fieldEl}
        class="relative flex min-w-0 flex-1 items-center rounded-lg border border-white/10 bg-[rgba(20,20,20,0.15)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_26px_rgba(0,0,0,0.35)] backdrop-blur-[10px]"
      >
        <div class="relative w-full overflow-hidden">
          <span
            bind:this={textEl}
            class="inline-block animate-gradient bg-[linear-gradient(to_right,var(--color-indigo-400),var(--color-indigo-100),var(--color-sky-400),var(--color-fuchsia-400))] bg-size-[200%_auto] bg-clip-text py-[0.15em] text-[clamp(1.7rem,4.5vw,3.8rem)] font-extrabold leading-[1.35] whitespace-pre text-transparent will-change-transform"
            style={`transform: translateX(${textShiftPx}px);`}
          >
            {typed || 'type something...'}
          </span>
        </div>
      </div>

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
  @font-face {
    font-family: Minecraft;
    src: url('/font/Minecraft.ttf');
  }

  @font-face {
    font-family: Minecraft-Bold;
    font-weight: bold;
    src: url('/font/Minecraft.ttf');
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
    box-shadow: 0 6px 0 rgba(0, 0, 0, 0.35), inset 0 2px 10px rgba(255, 255, 255, 0.08);
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
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.45);
    margin-top: -5px;
    transition: transform 120ms ease, box-shadow 120ms ease;
  }

  .slider::-webkit-slider-thumb:hover {
    transform: translateY(1px);
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.45);
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
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.45);
  }

  .slider:disabled {
    filter: grayscale(0.25);
  }
</style>