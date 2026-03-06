<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';

	let showSettings = false;
	let loading = false;
	let music = false;
	let musicVolume = 50;
	let sfx = true;

	function start() {
		goto('/type');
		loading = true;
	}

	function openSettings() {
		showSettings = true;
	}

	function closeSettings() {
		showSettings = false;
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.currentTarget === e.target) closeSettings();
	}

	function onKeydown(e: KeyboardEvent) {
		if (!showSettings) return;
		if (e.key === 'Escape') closeSettings();
	}
</script>

<svelte:window on:keydown={onKeydown} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Hubballi&display=swap" rel="stylesheet" />
</svelte:head>

<div class="hubballi min-h-screen bg-linear-to-t from-[#6155F5] to-[#55D2F5] text-white">
	<div class="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6">
		<div class="flex items-center justify-center gap-10">
			<div
				class="h-fit w-fit rounded-lg p-6 text-center
					shadow-[inset_0_10px_25px_rgba(0,0,0,0.35)]"
			>
				<h1 class="text-8xl leading-none">boardkey.io</h1>

				<div class="mt-10 w-full">
					<div
						class="grid w-full grid-cols-[1fr_auto_1fr] items-start
							gap-4
							max-sm:grid-cols-[1fr]
							max-sm:justify-items-center
							sm:gap-6"
					>
						<div class="flex justify-end max-sm:justify-center">
							<Button contentString="Settings" onClickFunc={openSettings} />
						</div>

						<div class="flex justify-center">
							<Button contentString={loading ? 'Loading...' : 'START'} onClickFunc={start} />
						</div>

						<div class="flex justify-start max-sm:justify-center">
							<label class="group relative inline-flex cursor-pointer flex-col items-center">
								<input class="peer sr-only" type="checkbox" bind:checked={music} />

								<div
									class="relative h-14 w-28 rounded-lg border border-white/30 bg-white/20
										bg-linear-to-b
										from-emerald-500/20 to-emerald-400/10
										shadow-[0_6px_0_rgba(0,0,0,0.35),inset_0_2px_8px_rgba(255,255,255,0.1)]
										transition-all duration-300 ease-out

										peer-checked:from-emerald-400/40
										peer-checked:to-emerald-300/30

										before:absolute before:top-1.5 before:left-1.5 before:h-11 before:w-11 before:rounded-lg
										before:bg-linear-to-b before:from-sky-200 before:to-sky-500
										before:transition-all before:duration-300

										peer-checked:before:translate-x-14
										peer-checked:before:from-emerald-300
										peer-checked:before:to-emerald-500"
								></div>

								<span class="mt-4 text-lg font-medium text-white transition-all duration-300"
									>Music</span
								>
							</label>
						</div>
					</div>
				</div>

				{#if showSettings}
					<div
						class="fixed inset-0 z-50 flex items-center justify-center p-4"
						on:click={onBackdropClick}
						role="presentation"
					>
						<div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

						<div
							class="relative w-full max-w-lg rounded-2xl border border-white/20 bg-white/10 p-6 text-left
								shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
							role="dialog"
							aria-modal="true"
							aria-label="Settings"
							tabindex="0"
						>
							<div class="flex items-start justify-between gap-4">
								<div>
									<h2 class="text-3xl leading-none">Settings</h2>
									<p class="mt-2 text-white/70">
										This is a skeleton dialog — add toggles, sliders, themes, etc.
									</p>
								</div>

								<button
									type="button"
									on:click={closeSettings}
									class="rounded-lg border border-white/20 bg-white/10 px-3 py-2
										shadow-[0_4px_0_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-150
										hover:translate-y-px hover:bg-white/15 hover:shadow-[0_3px_0_rgba(0,0,0,0.35)]
										active:translate-y-1 active:shadow-[0_0px_0_rgba(0,0,0,0.35)]"
									aria-label="Close settings"
								>
									✕
								</button>
							</div>

							<div class="mt-6 space-y-4">
								<div class="rounded-xl border border-white/15 bg-white/10 p-4">
									<div class="flex items-center justify-between gap-4">
										<div>
											<div class="text-xl">Ambient Music</div>
											<div class="text-white/70">Volume of quiet music playing</div>
										</div>
										<input
											id="music-volume"
											type="range"
											min="0"
											max="100"
											step="1"
											bind:value={musicVolume}
											disabled={!music}
											class="slider w-40 disabled:cursor-not-allowed disabled:opacity-50"
										/>
										<span class="w-10 text-right text-white/80">{musicVolume}%</span>
									</div>
								</div>

								<div class="rounded-xl border border-white/15 bg-white/10 p-4">
									<div class="flex items-center justify-between gap-4">
										<div>
											<div class="text-xl">Sfx</div>
											<div class="text-white/70">Enable/Disable Sound Effects</div>
										</div>

										<label class="relative inline-flex cursor-pointer items-center">
											<input class="peer sr-only" type="checkbox" bind:checked={sfx} />

											<div
												class="h-8 w-14 rounded-lg border border-white/30 bg-white/15
														shadow-[0_4px_0_rgba(0,0,0,0.35),inset_0_2px_8px_rgba(255,255,255,0.08)]
														transition-all duration-200

													   peer-checked:bg-white/20

													   before:absolute before:top-1 before:left-1 before:h-6 before:w-6 before:rounded-md
													   before:bg-linear-to-b before:from-sky-200 before:to-sky-500
													   before:shadow-[0_3px_0_rgba(0,0,0,0.35)]
													   before:transition-all before:duration-200

														peer-checked:before:translate-x-6
														peer-checked:before:from-emerald-200
														peer-checked:before:to-emerald-500"
											></div>
										</label>
									</div>
								</div>

								<div class="rounded-xl border border-white/15 bg-white/10 p-4">
									<div class="text-xl">Smth will go here... one day</div>
									<div class="mt-2 grid grid-cols-2 gap-3">
										<div class="h-10 rounded-lg bg-white/10"></div>
										<div class="h-10 rounded-lg bg-white/10"></div>
									</div>
								</div>
							</div>

							<div class="mt-6 flex items-center justify-end gap-3">
								<button
									type="button"
									on:click={closeSettings}
									class="h-12 rounded-lg border border-white/20 bg-white/10 px-5 text-lg
										shadow-[0_4px_0_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-150
										hover:translate-y-px hover:bg-white/15 hover:shadow-[0_3px_0_rgba(0,0,0,0.35)]
										active:translate-y-1 active:shadow-[0_0px_0_rgba(0,0,0,0.35)]"
								>
									Close
								</button>

								<button
									type="button"
									class="h-12 rounded-lg border border-white/25 bg-white/20 px-5 text-lg
										shadow-[0_4px_0_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-150
										hover:translate-y-px hover:bg-white/25 hover:shadow-[0_3px_0_rgba(0,0,0,0.35)]
										active:translate-y-1 active:shadow-[0_0px_0_rgba(0,0,0,0.35)]"
								>
									Save (later)
								</button>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div
				class="relative h-80 w-60 cursor-pointer overflow-hidden rounded-lg bg-purple-400 text-2xl font-bold"
			>
				<div class="peer absolute inset-0 z-10"></div>

				<div
					class="absolute -top-32 -left-16 h-44 w-32 rounded-full bg-purple-300 transition-all duration-500
						peer-hover:-top-20 peer-hover:-left-16 peer-hover:h-[140%] peer-hover:w-[140%]"
				></div>

				<div
					class="absolute -right-16 -bottom-32 flex h-44 w-36 items-end justify-end rounded-full bg-purple-300 text-center text-xl
						transition-all duration-500
						peer-hover:right-0 peer-hover:bottom-0 peer-hover:h-full peer-hover:w-full peer-hover:items-center peer-hover:justify-center peer-hover:rounded-b-none"
				>
					Did you know,<br />this was made<br /> by a 14 year old<br />with no AI or help?
				</div>

				<div class="flex h-full w-full items-center justify-center uppercase">hover me :3</div>
			</div>
		</div>

		<!-- <p class="mt-10 max-w-3xl text-center text-2xl leading-snug text-white">
				<span class="inline-flex items-center gap-2 whitespace-nowrap">
					Play my
					<svg
						class="h-6 w-6 shrink-0 fill-white"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 640 640"
						aria-hidden="true"
					>
						<path
							d="M298.5 156.9C312.8 199.8 298.2 243.1 265.9 253.7C233.6 264.3 195.8 238.1 181.5 195.2C167.2 152.3 181.8 109 214.1 98.4C246.4 87.8 284.2 114 298.5 156.9zM164.4 262.6C183.3 295 178.7 332.7 154.2 346.7C129.7 360.7 94.5 345.8 75.7 313.4C56.9 281 61.4 243.3 85.9 229.3C110.4 215.3 145.6 230.2 164.4 262.6zM133.2 465.2C185.6 323.9 278.7 288 320 288C361.3 288 454.4 323.9 506.8 465.2C510.4 474.9 512 485.3 512 495.7L512 497.3C512 523.1 491.1 544 465.3 544C453.8 544 442.4 542.6 431.3 539.8L343.3 517.8C328 514 312 514 296.7 517.8L208.7 539.8C197.6 542.6 186.2 544 174.7 544C148.9 544 128 523.1 128 497.3L128 495.7C128 485.3 129.6 474.9 133.2 465.2zM485.8 346.7C461.3 332.7 456.7 295 475.6 262.6C494.5 230.2 529.6 215.3 554.1 229.3C578.6 243.3 583.2 281 564.3 313.4C545.4 345.8 510.3 360.7 485.8 346.7zM374.1 253.7C341.8 243.1 327.2 199.8 341.5 156.9C355.8 114 393.6 87.8 425.9 98.4C458.2 109 472.8 152.3 458.5 195.2C444.2 238.1 406.4 264.3 374.1 253.7z"
						/>
					</svg>
				</span>
				pawsome keyboard game for when you're bored! With many themes, easter eggs and more!
			</p> -->
		<p class="mt-10 max-w-3xl text-center text-2xl leading-snug text-white">
			Play my awesome keyboard game for when you're bored! With many themes, easter eggs and more!
		</p>
	</div>
</div>

<style>
	.hubballi {
		font-family:
			'Hubballi',
			system-ui,
			-apple-system,
			Segoe UI,
			Roboto,
			sans-serif;
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
