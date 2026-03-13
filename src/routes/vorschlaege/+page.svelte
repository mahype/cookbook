<script lang="ts">
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let pantryNames = $state(data.pantryNames);

	function handlePantryAdd(name: string) {
		const lower = name.toLowerCase();
		if (!pantryNames.includes(lower)) {
			pantryNames = [...pantryNames, lower];
		}
	}

	function handlePantryRemove(name: string) {
		pantryNames = pantryNames.filter((p) => p !== name.toLowerCase());
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}
</script>

<div class="max-w-lg mx-auto px-4 pt-6 pb-16">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-warm-900">Tagesvorschläge</h1>
		<p class="text-warm-500 text-sm mt-1">{formatDate(data.date)}</p>
	</header>

	{#if data.recipes.length === 0}
		<div class="text-center py-16">
			<div class="text-warm-300 mb-4"><svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div>
			<p class="text-warm-500 text-lg">Keine Vorschläge für heute</p>
			<p class="text-warm-400 text-sm mt-2">Schau morgen wieder vorbei!</p>
		</div>
	{:else}
		<div class="space-y-4 mb-6">
			{#each data.recipes as recipe (recipe.id)}
				<RecipeCard
					{recipe}
					approvable={true}
					expandable={true}
					{pantryNames}
					onPantryAdd={handlePantryAdd}
					onPantryRemove={handlePantryRemove}
				/>
			{/each}
		</div>
	{/if}
</div>
