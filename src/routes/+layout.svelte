<script lang="ts">
	import '../layout.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	const { children } = $props();

	function isDesktop(): boolean {
		if (typeof window === 'undefined') return true;

		const ua = navigator.userAgent.toLowerCase();
		const isMobile = /android|iphone|ipad|ipod|blackberry|windows phone|mobile/i.test(ua);

		return !isMobile;
	}

	onMount(() => {
		if (!isDesktop()) {
			goto('/requirement');
		}
	});
</script>

<div class="hubballi-regular">
	{@render children()}
</div>
