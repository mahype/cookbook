<script lang="ts">
	import RecipeCard from '$lib/components/RecipeCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedIds = $state<Set<number>>(new Set());
	let approving = $state(false);
	let approveMessage = $state('');
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

	function toggleRecipe(id: number) {
		const next = new Set(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedIds = next;
	}

	async function approveSelected() {
		if (selectedIds.size === 0) return;
		approving = true;
		approveMessage = '';

		try {
			const res = await fetch('/api/rezepte/approve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: Array.from(selectedIds) })
			});

			const result = await res.json();

			if (res.ok) {
				approveMessage = `${result.updated} Rezept${result.updated !== 1 ? 'e' : ''} übernommen!`;
				selectedIds = new Set();
				// Reload page to reflect status changes
				setTimeout(() => {
					window.location.reload();
				}, 1500);
			} else {
				approveMessage = result.error || 'Fehler beim Übernehmen';
			}
		} catch {
			approveMessage = 'Netzwerkfehler – bitte erneut versuchen';
		} finally {
			approving = false;
		}
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

<div class="max-w-lg mx-auto px-4 pt-6">
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
				{@const isApproved = recipe.status === 'approved'}
				{#if isApproved}
					<div class="opacity-60">
						<RecipeCard {recipe} selectable={false} expandable={true} {pantryNames} onPantryAdd={handlePantryAdd} onPantryRemove={handlePantryRemove} />
						<p class="text-center text-herb-600 text-sm font-medium -mt-1 mb-2">Bereits übernommen</p>
					</div>
				{:else}
					<RecipeCard
						{recipe}
						selectable={true}
						selected={selectedIds.has(recipe.id)}
						onToggle={toggleRecipe}
						expandable={true}
						{pantryNames}
						onPantryAdd={handlePantryAdd}
						onPantryRemove={handlePantryRemove}
					/>
				{/if}
			{/each}
		</div>

		{#if data.recipes.some((r) => r.status === 'vorschlag')}
			<div class="sticky bottom-20 z-40 pb-4">
				{#if approveMessage}
					<div class="text-center py-3 px-4 rounded-xl mb-3 {approveMessage.includes('Fehler') || approveMessage.includes('Netzwerk') ? 'bg-red-50 text-red-700' : 'bg-herb-50 text-herb-700'} font-medium text-sm">
						{approveMessage}
					</div>
				{/if}
				<button
					onclick={approveSelected}
					disabled={selectedIds.size === 0 || approving}
					class="w-full py-4 px-6 min-h-[52px] rounded-2xl font-semibold text-white text-base transition-all duration-200
						{selectedIds.size > 0 && !approving
							? 'bg-spice-500 hover:bg-spice-600 shadow-lg shadow-spice-500/30 active:scale-[0.98]'
							: 'bg-warm-300 cursor-not-allowed'}"
				>
					{#if approving}
						Wird übernommen...
					{:else if selectedIds.size === 0}
						Rezepte auswählen
					{:else}
						{selectedIds.size} Rezept{selectedIds.size !== 1 ? 'e' : ''} übernehmen
					{/if}
				</button>
			</div>
		{/if}
	{/if}
</div>
