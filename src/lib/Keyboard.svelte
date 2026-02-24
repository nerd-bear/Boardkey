<script lang="ts">
	import type { KeyDef } from './keyboardLayout.ts';
	import { createEventDispatcher } from 'svelte';

	export let keyboard: KeyDef[][];
	export let pressed: Set<string> = new Set();
	export let wrongKeys: Set<string> = new Set();

	/**
	 * Size presets
	 * sm = compact
	 * md = normal
	 * lg = showcase
	 */
	export let size: 'sm' | 'md' | 'lg' = 'md';

	export let onSound: (() => void | Promise<void>) | null = null;

	const dispatch = createEventDispatcher<{
		press: { code: string };
		down: { code: string };
		up: { code: string };
	}>();

	const SIZE_PRESETS = {
		sm: { key: 42, gap: 6, font: 11, pad: 8, radius: 10 },
		md: { key: 54, gap: 8, font: 13, pad: 10, radius: 12 },
		lg: { key: 70, gap: 12, font: 14, pad: 12, radius: 12 }
	} as const;

	$: metrics = SIZE_PRESETS[size];

	async function setDown(code: string) {
		dispatch('down', { code });
		if (onSound) await onSound();
		dispatch('press', { code });
	}

	function setUp(code: string) {
		dispatch('up', { code });
	}
</script>

<div
	class="keyboard-shell mx-auto w-fit max-w-full overflow-x-auto rounded-lg bg-[linear-gradient(45deg,#999_5%,#fff_10%,#ccc_30%,#ddd_50%,#ccc_70%,#fff_80%,#999_95%)] text-base font-medium text-black shadow-md outline-none"
	style={`padding:${metrics.pad}px`}
>
	<div class="space-y-2" style={`--row-gap:${metrics.gap}px`}>
		{#each keyboard as row}
			<div class="flex justify-center" style={`gap:${metrics.gap}px`}>
				{#each row as key}
					<button
						type="button"
						class={`keycap ${pressed.has(key.code) ? 'pressed' : ''} ${wrongKeys.has(key.code) ? 'wrong' : ''}`}
						style={`width:${(key.w ?? 1) * metrics.key}px;height:${metrics.key}px;--r:${metrics.radius}px`}
						on:pointerdown={() => setDown(key.code)}
						on:pointerup={() => setUp(key.code)}
						on:pointerleave={() => setUp(key.code)}
						aria-label={`Key ${key.label}`}
					>
						<span class="letter" style={`--font-size:${metrics.font}px`}>{key.label}</span>
					</button>
				{/each}
			</div>
		{/each}
	</div>
</div>

<style>
	.keycap {
		position: relative;
		border-radius: var(--r, 12px);
		background: linear-gradient(180deg, #282828, #202020);
		box-shadow:
			inset -8px 0 8px rgba(0, 0, 0, 0.15),
			inset 0 -8px 8px rgba(0, 0, 0, 0.25),
			0 0 0 2px rgba(0, 0, 0, 0.75),
			10px 20px 25px rgba(0, 0, 0, 0.4);
		overflow: hidden;
		transition:
			transform 0.08s ease,
			box-shadow 0.08s ease;
		border: none;
		padding: 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		flex: 0 0 auto; 
	}

	.letter {
		position: absolute;
		left: 10px;
		top: 8px;
		color: #e9e9e9;
		font-size: var(--font-size, 13px);
		transition: transform 0.08s ease;
		z-index: 1;
		user-select: none;
	}

	.keycap::before {
		content: '';
		position: absolute;
		top: 3px;
		left: 4px;
		bottom: 12px;
		right: 10px;
		border-radius: var(--r, 12px);
		background: linear-gradient(90deg, #232323, #4a4a4a);
		box-shadow:
			-10px -10px 10px rgba(255, 255, 255, 0.18),
			10px 5px 10px rgba(0, 0, 0, 0.15);
		transition: all 0.08s ease;
	}

	.keycap.pressed {
		transform: translateY(2px);
		box-shadow:
			inset -4px 0 4px rgba(0, 0, 0, 0.1),
			inset 0 -4px 4px rgba(0, 0, 0, 0.15),
			0 0 0 2px rgba(0, 0, 0, 0.5),
			5px 10px 15px rgba(0, 0, 0, 0.3);
	}

	.keycap.pressed::before {
		top: 5px;
		left: 5px;
		bottom: 10px;
		right: 9px;
	}

	.keycap.pressed .letter {
		transform: translateY(1px);
	}

	.keycap.wrong {
		box-shadow:
			inset -6px 0 6px rgba(255, 70, 70, 0.18),
			inset 0 -6px 6px rgba(255, 70, 70, 0.28),
			0 0 14px rgba(255, 60, 60, 0.22),
			0 0 0 2px rgba(255, 80, 80, 0.35);
		transition: box-shadow 0.15s ease;
	}

	.keycap.wrong::before {
		background: linear-gradient(90deg, #2a1b1b, #5b2525);
	}
</style>