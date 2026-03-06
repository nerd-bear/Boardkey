<script lang="ts">
	import { onMount } from 'svelte';
	import { AmbientSoundPlayer, type AmbientSoundConfig } from '$lib/audio/ambientSoundPlayer';

	let player: AmbientSoundPlayer | null = null;

	let started = false;
	let paused = false;
	let loaded = false;

	let masterVolume = 0.8;

	let config: AmbientSoundConfig = { sounds: [] };
	let songEnabled: Record<string, boolean> = {};

	onMount(() => {
		let destroyed = false;

		player = new AmbientSoundPlayer(masterVolume);

		async function init() {
			try {
				config = await loadAmbientConfig('/audio/ambient.json');

				if (destroyed || !player) return;

				for (const sound of config.sounds) {
					songEnabled[sound.id] = sound.enabled ?? true;
				}

				await player.loadConfig(config);

				if (destroyed || !player) return;

				player.setMasterVolume(masterVolume);
				loaded = true;
			} catch (error) {
				console.error('Failed to initialize ambient player:', error);
			}
		}

		init();

		return () => {
			destroyed = true;
			player?.destroy();
		};
	});

	async function loadAmbientConfig(url: string): Promise<AmbientSoundConfig> {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to load sound config: ${url} (${response.status})`);
		}

		return (await response.json()) as AmbientSoundConfig;
	}

	async function startAmbient() {
		if (!player || started || !loaded) return;

		player.setMasterVolume(masterVolume);
		await player.start();

		started = true;
		paused = false;
	}

	function stopAmbient() {
		if (!player) return;

		player.stop();
		started = false;
		paused = false;
	}

	async function pauseAmbient() {
		if (!player || !started || paused) return;

		await player.pause();
		paused = true;
	}

	async function resumeAmbient() {
		if (!player || !started || !paused) return;

		await player.resume();
		paused = false;
	}

	function handleMasterVolumeInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		masterVolume = Number(target.value);
		player?.setMasterVolume(masterVolume);
	}

	function toggleSong(id: string) {
		const enabled = !songEnabled[id];
		songEnabled[id] = enabled;
		player?.setEnabled(id, enabled);
	}

	$: status = !loaded ? 'Loading...' : !started ? 'Stopped' : paused ? 'Paused' : 'Running';

	$: statusColor = !loaded
		? 'text-yellow-400'
		: !started
			? 'text-red-400'
			: paused
				? 'text-yellow-400'
				: 'text-green-400';
</script>

<div class="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-10 text-zinc-100">
	<div class="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
		<h2 class="text-2xl font-semibold tracking-tight">
			Testing suite for sound kit of boredkey.io
		</h2>

		<p class="mt-2 text-sm text-zinc-400">Ambient player controls</p>

		<div class="mt-6 flex flex-wrap gap-3">
			<button
				on:click={startAmbient}
				disabled={!loaded || started}
				class="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Start
			</button>

			<button
				on:click={stopAmbient}
				disabled={!started}
				class="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Stop
			</button>

			<button
				on:click={pauseAmbient}
				disabled={!started || paused}
				class="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Pause
			</button>

			<button
				on:click={resumeAmbient}
				disabled={!started || !paused}
				class="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Resume
			</button>
		</div>
                                                            
		<div class="mt-6 text-sm text-zinc-400">
			Status:
			<span class={statusColor}>{status}</span>
		</div>

		<div class="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
			<div class="mb-2 flex items-center justify-between text-sm text-zinc-400">
				<span>Master volume</span>
				<span>{Math.round(masterVolume * 100)}%</span>
			</div>

			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={masterVolume}
				on:input={handleMasterVolumeInput}
				class="w-full accent-white"
			/>
		</div>

		<div class="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
			<div class="mb-3 text-sm font-medium text-zinc-300">Songs</div>

			<div class="space-y-3">
				{#each config.sounds as sound}
					<div
						class="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
					>
						<div>
							<div class="text-sm font-medium text-zinc-100">{sound.id}</div>
							<div class="text-xs text-zinc-400">
								Volume: {Math.round(sound.volume * 100)}%
							</div>
						</div>

						<button
							on:click={() => toggleSong(sound.id)}
							class={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
								songEnabled[sound.id]
									? 'bg-green-500/15 text-green-300 hover:bg-green-500/25'
									: 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
							}`}
						>
							{songEnabled[sound.id] ? 'Enabled' : 'Disabled'}
						</button>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
