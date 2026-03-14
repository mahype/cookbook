<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// Client-side redirect for Capacitor (no server-side redirect available)
	onMount(() => {
		goto('/rezepte', { replaceState: true });
	});
</script>

<div class="flex items-center justify-center h-screen">
	<div class="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
</div>
