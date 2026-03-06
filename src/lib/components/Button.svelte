<script lang="ts">
	export let onClickFunc: ((event: MouseEvent) => void) | undefined = undefined;
	export let contentString: string;
</script>

<button
	type="button"
	on:click={onClickFunc}
	class="h-14 rounded-lg border border-white/30 bg-white/20 px-6 py-3 text-xl tracking-wide
								shadow-[0_6px_0_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-150
								hover:translate-y-px hover:shadow-[0_4px_0_rgba(0,0,0,0.35)]
								active:translate-y-1.5 active:shadow-[0_0px_0_rgba(0,0,0,0.35)]"
>
	{contentString}
</button>
