<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { AmbientSoundPlayer } from '$lib/audio/ambientSoundPlayer';	
	import Button from '$lib/components/Button.svelte';
	import { settings } from '$lib/stores/settings';
	import { unlockAudio } from '$lib/audio/audioContext.ts';

	let showSettings = false;
	let showInfo = false;
	let loading = false;

	let selectedFont = $settings.selectedFont;
	let music = $settings.music;
	let musicVolume = $settings.musicVolume;
	let sfx = $settings.sfx;

	let player: AmbientSoundPlayer | null = null;
	let ambientLoaded = false;
	let ambientLoading = true;
	let ambientError = '';

	let settingsModal: HTMLElement | null = null;
	let infoModal: HTMLElement | null = null;
	let lastTrigger: HTMLElement | null = null;

	const fonts = [
		{ name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
		{ name: 'Fira Code', value: "'Fira Code', monospace" },
		{ name: 'Space Mono', value: "'Space Mono', monospace" },
		{ name: 'Hubballi', value: "'Hubballi', sans-serif" },
		{ name: 'Minecraft', value: "'Minecraft', monospace" },
	];
	$: activeFont = fonts.find(f => f.name === selectedFont)?.value;

	$: settings.patch({ selectedFont, music, musicVolume, sfx });

	
	function start() {
		if (loading) return;
		loading = true;
		goto('/type');
	}

	function openLeaderboard() { goto('/leaderboard'); }

	async function openSettings(event?: MouseEvent) {
		lastTrigger = (event?.currentTarget as HTMLElement) ?? (document.activeElement as HTMLElement | null);
		showSettings = true;
		await tick();
		settingsModal?.focus();
	}

	function closeSettings() { showSettings = false; lastTrigger?.focus(); }

	async function openInfo(event?: MouseEvent) {
		lastTrigger = (event?.currentTarget as HTMLElement) ?? (document.activeElement as HTMLElement | null);
		showInfo = true;
		await tick();
		infoModal?.focus();
	}

	function closeInfo() { showInfo = false; lastTrigger?.focus(); }

	function isInteractiveElement(target: EventTarget | null): boolean {
		const el = target as HTMLElement | null;
		if (!el) return false;
		const tag = el.tagName;
		return (
			tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA' ||
			tag === 'SELECT' || tag === 'A' || el.isContentEditable ||
			el.hasAttribute('tabindex') || el.getAttribute('role') === 'button' ||
			el.getAttribute('role') === 'link' ||
			el.closest('button, a, input, textarea, select, [contenteditable="true"], [tabindex], [role="button"], [role="link"]') !== null
		);
	}

	function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
		if (!container) return [];
		const selectors = ['a[href]','button:not([disabled])','textarea:not([disabled])','input:not([disabled])','select:not([disabled])','[tabindex]:not([tabindex="-1"])'].join(',');
		return Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(el => {
			const style = getComputedStyle(el);
			return !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true' && style.display !== 'none' && style.visibility !== 'hidden';
		});
	}

	function trapFocus(e: KeyboardEvent, container: HTMLElement | null) {
		if (e.key !== 'Tab' || !container) return;
		const focusable = getFocusableElements(container);
		if (focusable.length === 0) { e.preventDefault(); container.focus(); return; }
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const active = document.activeElement as HTMLElement | null;
		if (e.shiftKey) { if (active === first || active === container) { e.preventDefault(); last.focus(); } }
		else if (active === last) { e.preventDefault(); first.focus(); }
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (showSettings) { e.preventDefault(); closeSettings(); return; }
			if (showInfo) { e.preventDefault(); closeInfo(); return; }
		}
		if (showSettings) { trapFocus(e, settingsModal); return; }
		if (showInfo) { trapFocus(e, infoModal); return; }
		if (e.key === 'Enter' && !showSettings && !showInfo && !isInteractiveElement(e.target)) start();
	}

	onMount(() => {
		let destroyed = false;
		player = new AmbientSoundPlayer(musicVolume / 100);

		async function init() {
			try {
				ambientLoading = true;
				ambientError = '';
				await player.loadConfigFromUrl('/audio/ambient.json');
				if (destroyed || !player) return;
				ambientLoaded = true;

				if (music) {
					try { await unlockAudio(); await player.start(); } catch { music = false; }
				}
			} catch (error) {
				console.error('Failed to initialize ambient player:', error);
				if (!destroyed) { ambientError = 'Music failed to load.'; ambientLoaded = false; }
			} finally {
				if (!destroyed) ambientLoading = false;
			}
		}

		init();
		return () => { destroyed = true; player?.destroy(); player = null; };
	});

	async function enableMusic() {
		if (!player || !ambientLoaded) throw new Error('Ambient player is not ready');
		await unlockAudio(); 
		player.setMasterVolume(musicVolume / 100);
		await player.start();
	}

	function disableMusic() { player?.stop(); }

	async function handleMusicToggle(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		if (!target.checked) { disableMusic(); music = false; return; }
		try {
			await enableMusic();
			music = true;
			ambientError = '';
		} catch (error) {
			console.error('Failed to start music:', error);
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

	$: if (player && ambientLoaded) { player.setMasterVolume(musicVolume / 100); }
</script>

<svelte:window on:keydown={onKeydown} />

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=JetBrains+Mono&family=Fira+Code&family=Space+Mono&family=Hubballi&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div
  class="min-h-screen bg-linear-to-t from-[#6155F5] to-[#55D2F5] text-white"
  style={`font-family: ${activeFont};`}
>
  <div
    class="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-10"
  >
    <div
      class="main-layout mx-auto flex w-full max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center"
    >
      <div
        class="main-panel w-full max-w-4xl rounded-lg p-6 text-center shadow-[inset_0_10px_25px_rgba(0,0,0,0.35)]"
      >
        <h1 class="text-8xl leading-none max-sm:text-6xl">boardkey.io</h1>
        
        <div class="mt-10 w-full">
          <div
            class="grid w-full grid-cols-[1fr_auto_1fr] items-start gap-4 max-sm:grid-cols-1 max-sm:justify-items-center sm:gap-6"
          >
            <div class="flex justify-end max-sm:justify-center">
              <button
                type="button"
                on:click={openSettings}
                class="button-reset"
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
            
            <div class="flex justify-center">
              <Button contentString={loading ? 'Loading...' : 'START'} onClickFunc={start} />
            </div>
            
            <div class="flex justify-start max-sm:justify-center">
              <label class="group relative inline-flex cursor-pointer flex-col items-center">
                <input
                  class="peer sr-only"
                  type="checkbox"
                  checked={music}
                  on:change={handleMusicToggle}
                  disabled={!ambientLoaded}
                  aria-label="Toggle music"
                  aria-describedby="music-status"
                />
                <div
                  class="relative h-14 w-28 rounded-lg border border-white/30 bg-gradient-to-b from-white/20 to-white/20 shadow-[0_6px_0_rgba(0,0,0,0.35),inset_0_2px_8px_rgba(255,255,255,0.1)] transition-all duration-300 ease-out peer-checked:from-emerald-400/40 peer-checked:to-emerald-300/30 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 before:absolute before:top-1.5 before:left-1.5 before:h-11 before:w-11 before:rounded-lg before:bg-linear-to-b before:from-sky-300 before:to-sky-500 before:transition-all before:duration-300 peer-checked:before:translate-x-14"
                ></div>
                <span class="mt-4 text-lg font-medium text-white transition-all duration-300">
                  Music
                </span>
                <div id="music-status" class="mt-1 min-h-5 text-center text-sm text-white/80">
                  {#if ambientLoading}
                    <span class="text-white/70">Loading…</span>
                  {:else if ambientError}
                    <span>{ambientError}</span>
                  {:else if !ambientLoaded}
                    <span class="text-white/70">Unavailable</span>
                  {/if}
                </div>
              </label>
            </div>
          </div>
        </div>
        
        <p class="mt-10 max-w-3xl text-center text-2xl leading-snug text-white max-sm:text-xl">
          Play my awesome keyboard game for when you're bored! With many themes, easter eggs and
          more!
        </p>
      </div>

      <div class="extra-panel flex w-full max-w-sm shrink-0 flex-col gap-4">
        <div
          class="group relative h-80 w-full cursor-pointer overflow-hidden rounded-lg bg-purple-400 text-2xl font-bold"
        >
          <div
            class="absolute -top-32 -left-16 h-44 w-32 rounded-full bg-purple-300 transition-all duration-500 group-hover:-top-20 group-hover:-left-16 group-hover:h-[140%] group-hover:w-[140%]"
          ></div>
          <div
            class="absolute -right-16 -bottom-32 flex h-44 w-36 items-end justify-end rounded-full bg-purple-300 text-center text-xl transition-all duration-500 group-hover:right-0 group-hover:bottom-0 group-hover:h-full group-hover:w-full group-hover:items-center group-hover:justify-center group-hover:rounded-b-none"
          >
            Did you know,<br />this was made<br />
            by a 14 year old<br />with no AI or help?
          </div>
          <div class="flex h-full w-full items-center justify-center uppercase">hover me :3</div>
        </div>

        <div class="extras-card rounded-2xl p-4 text-left">
          <div class="mb-3 text-lg tracking-wide text-white/75 uppercase">Extras</div>
          
          <button
            type="button"
            on:click={openLeaderboard}
            class="leaderboard-btn group relative w-full overflow-hidden rounded-lg border border-white/25 px-5 py-4 text-left text-white"
            aria-label="Open leaderboard"
          >
            <div class="absolute inset-0 bg-linear-to-b from-yellow-300/45 via-amber-300/25 to-orange-400/30"></div>
            <div class="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div class="relative z-10 flex items-center justify-between gap-3">
              <div>
                <div class="text-2xl leading-none">Leaderboard</div>
                <div class="mt-2 text-sm text-white/85">see top scores and flex</div>
              </div>
              <svg
                class="h-12 fill-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
                aria-hidden="true"
              >
                <path
                  d="M345 151.2C354.2 143.9 360 132.6 360 120C360 97.9 342.1 80 320 80C297.9 80 280 97.9 280 120C280 132.6 285.9 143.9 295 151.2L226.6 258.8C216.6 274.5 195.3 278.4 180.4 267.2L120.9 222.7C125.4 216.3 128 208.4 128 200C128 177.9 110.1 160 88 160C65.9 160 48 177.9 48 200C48 221.8 65.5 239.6 87.2 240L119.8 457.5C124.5 488.8 151.4 512 183.1 512L456.9 512C488.6 512 515.5 488.8 520.2 457.5L552.8 240C574.5 239.6 592 221.8 592 200C592 177.9 574.1 160 552 160C529.9 160 512 177.9 512 200C512 208.4 514.6 216.3 519.1 222.7L459.7 267.3C444.8 278.5 423.5 274.6 413.5 258.9L345 151.2z"
                />
              </svg>
            </div>
          </button>
          
          <button
            type="button"
            on:click={openInfo}
            class="info-btn group relative mt-4 w-full overflow-hidden rounded-lg p-4 text-left"
            aria-haspopup="dialog"
            aria-expanded={showInfo}
            aria-controls="info-dialog"
          >
            <div
              class="absolute inset-0 bg-linear-to-r from-white/8 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            ></div>
            <div class="relative z-10">
              <div class="text-lg text-white/85">extra info</div>
              <div class="mt-1 text-2xl leading-none">cool game facts ✦</div>
              <div class="mt-2 text-base text-white/75">
                click for extra info and hidden vibes
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>

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
                  <input class="peer sr-only" type="checkbox" bind:checked={sfx} aria-label="Toggle sound effects" />
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

    {#if showInfo}
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
        <button
          type="button"
          class="modal-backdrop absolute inset-0 cursor-default"
          on:click={closeInfo}
          aria-label="Close extra info dialog"
        ></button>
        
        <div
          id="info-dialog"
          bind:this={infoModal}
          class="modal-card relative w-full max-w-lg rounded-2xl p-6 text-left"
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-title"
          aria-describedby="info-description"
          tabindex="-1"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="info-title" class="text-3xl leading-none">Cool Extra Info</h2>
              <p id="info-description" class="mt-2 text-white/70">
                A few fun little details about the game.
              </p>
            </div>
            <button
              type="button"
              on:click={closeInfo}
              class="rounded-lg border border-white/20 bg-white/10 px-3 py-2 shadow-[0_4px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:translate-y-px hover:bg-white/15 hover:shadow-[0_3px_0_rgba(0,0,0,0.35)] active:translate-y-1 active:shadow-[0_0px_0_rgba(0,0,0,0.35)]"
              aria-label="Close extra info"
            >
              ✕
            </button>
          </div>

          <div class="mt-6 rounded-xl border border-white/15 bg-white/10 p-5 text-xl leading-relaxed text-white/90">
            <p>
              boardkey.io was made to be a fun keyboard game you can jump into when you're bored and
              just want to vibe for a bit.
            </p>
            <p class="mt-4">
              It has themes, little surprises, and hidden easter eggs sprinkled around for people
              who like clicking random things and exploring.
            </p>
            <p class="mt-4">
              The goal is simple: make something playful, stylish, and satisfying enough that you
              want to come back and beat your score.
            </p>
            <p class="mt-4 text-white/70">
              More secrets, more themes, and more weird little details can always be added later :3
            </p>
          </div>

          <div class="mt-6 flex justify-end">
            <button
              type="button"
              on:click={closeInfo}
              class="h-12 rounded-lg border border-white/20 bg-white/10 px-5 text-lg shadow-[0_4px_0_rgba(0,0,0,0.35)] transition-all duration-150 hover:translate-y-px hover:bg-white/15 hover:shadow-[0_3px_0_rgba(0,0,0,0.35)] active:translate-y-1 active:shadow-[0_0px_0_rgba(0,0,0,0.35)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    {/if}
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
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .info-btn {
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.22);
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
  }

  .info-btn:hover {
    transform: translateY(1px);
    background: rgba(255, 255, 255, 0.18);
    box-shadow: 0 7px 0 rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .info-btn:active {
    transform: translateY(4px);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .leaderboard-btn {
    box-shadow: 0 6px 0 rgba(0, 0, 0, 0.35), inset 0 2px 8px rgba(255, 255, 255, 0.14),
      0 0 24px rgba(255, 211, 92, 0.18);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: transform 150ms ease, box-shadow 150ms ease, filter 150ms ease;
  }

  .leaderboard-btn:hover {
    transform: translateY(1px);
    box-shadow: 0 5px 0 rgba(0, 0, 0, 0.35), inset 0 2px 8px rgba(255, 255, 255, 0.16),
      0 0 28px rgba(255, 211, 92, 0.28);
    filter: brightness(1.03);
  }

  .leaderboard-btn:active {
    transform: translateY(4px);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.35), inset 0 2px 8px rgba(255, 255, 255, 0.16);
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

  .font-select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background: linear-gradient(rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.08)),
      rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(6px);
    font-size: 16px;
    cursor: pointer;
    transition: background 150ms ease, transform 120ms ease, box-shadow 120ms ease;
  }

  .font-select:hover {
    transform: translateY(1px);
  }

  .font-select:active {
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
    background: rgba(255, 255, 255, 0.16);
  }

  .font-select option {
    color: white;
    padding: 10px;
  }
</style>