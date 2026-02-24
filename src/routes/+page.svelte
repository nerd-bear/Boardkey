<script lang="ts">
	import { goto } from '$app/navigation';

	function start() {
		goto('/type');
	}
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Hubballi&display=swap" rel="stylesheet" />
</svelte:head>

<div class="hubballi min-h-screen bg-gradient-to-t from-[#6155F5] to-[#55D2F5] text-white">
	<div class="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6">
		<div class="flex items-center justify-center gap-10">
			<div
				class="h-fit w-fit rounded-xl p-6 text-center
				shadow-[inset_0_10px_25px_rgba(0,0,0,0.35)]"
			>
				<h1 class="text-8xl leading-none">boardkey.io</h1>

				<div class="mt-8">
					<button
						on:click={start}
						class="rounded-lg border border-white/30 bg-white/20 px-8 py-3 text-xl tracking-wide
						shadow-[0_6px_0_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-150
						hover:translate-y-px hover:shadow-[0_4px_0_rgba(0,0,0,0.35)]
						active:translate-y-1.5 active:shadow-[0_0px_0_rgba(0,0,0,0.35)]"
					>
						START
					</button>
				</div>
			</div>

			<div
				class="relative h-80 w-60 cursor-pointer overflow-hidden rounded-3xl bg-purple-400 text-2xl font-bold"
			>
				<div class="peer absolute inset-0 z-10"></div>

				<div
					class="absolute -top-32 -left-16 h-44 w-32 rounded-full bg-purple-300 transition-all duration-500
					peer-hover:-top-20 peer-hover:-left-16 peer-hover:h-[140%] peer-hover:w-[140%]"
				/>

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

		<p class="mt-10 max-w-3xl text-center text-2xl leading-snug text-white">
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
</style>
