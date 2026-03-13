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
			<div class="text-5xl mb-4">🍳</div>
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
