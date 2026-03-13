<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import StepIndicator from '$lib/components/StepIndicator.svelte';

	type Person = { id: number; name: string };
	type Recipe = { id: number; name: string; cuisine: string; image_url: string };
	type MealPlan = { id: number; persons: Person[]; recipes: Recipe[]; status: string; votes: Record<string, Record<string, number>> };

	let plan = $state<MealPlan | null>(null);
	let loading = $state(true);
	let phase = $state<'start' | 'voting' | 'handoff' | 'result'>('start');
	let currentPersonIdx = $state(0);
	let ratings = $state<Record<number, number>>({});
	let allVotes = $state<Record<number, Record<number, number>>>({});
	let submitting = $state(false);

	const planId = $derived($page.params.id);

	async function load() {
		const res = await fetch(`/api/planen/${planId}`);
		if (res.ok) plan = await res.json();
		loading = false;
	}

	$effect(() => { load(); });

	function currentPerson(): Person | undefined {
		return plan?.persons[currentPersonIdx];
	}

	function nextPerson(): Person | undefined {
		return plan?.persons[currentPersonIdx + 1];
	}

	function allRated(): boolean {
		if (!plan) return false;
		return plan.recipes.every(r => ratings[r.id] != null && ratings[r.id] > 0);
	}

	function setRating(recipeId: number, stars: number) {
		ratings = { ...ratings, [recipeId]: stars };
	}

	function startVoting() {
		currentPersonIdx = 0;
		ratings = {};
		allVotes = {};
		phase = 'voting';
	}

	async function submitVote() {
		if (!plan) return;
		const person = currentPerson();
		if (!person) return;
		submitting = true;

		allVotes = { ...allVotes, [person.id]: { ...ratings } };

		await fetch(`/api/planen/${planId}/vote`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ person_id: person.id, votes: ratings })
		});

		submitting = false;

		if (currentPersonIdx < plan.persons.length - 1) {
			phase = 'handoff';
		} else {
			phase = 'result';
		}
	}

	function nextVoter() {
		currentPersonIdx++;
		ratings = {};
		phase = 'voting';
	}

	function getResults(): { recipe: Recipe; avg: number; total: number }[] {
		if (!plan) return [];
		return plan.recipes.map(r => {
			const votes = Object.values(allVotes).map(v => v[r.id]).filter(v => v != null);
			const avg = votes.length > 0 ? votes.reduce((a, b) => a + b, 0) / votes.length : 0;
			return { recipe: r, avg, total: votes.length };
		}).sort((a, b) => b.avg - a.avg);
	}

	async function finish() {
		const results = getResults();
		if (results.length > 0) {
			await fetch(`/api/planen/${planId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'completed', winner_recipe_id: results[0].recipe.id })
			});
		}
		goto('/rezepte');
	}
</script>

<div class="max-w-lg mx-auto px-4 pt-6 pb-24">
	<StepIndicator current={3} />

	{#if loading}
		<div class="text-center py-12 text-warm-500">Laden...</div>
	{:else if !plan}
		<div class="text-center py-12 text-warm-500">Plan nicht gefunden</div>
	{:else if phase === 'start'}
		<h1 class="text-2xl font-bold text-warm-900 mt-6 mb-6">Abstimmung</h1>

		<div class="mb-6">
			<h2 class="text-sm font-semibold text-warm-600 mb-2">Rezepte zur Wahl</h2>
			<div class="space-y-2">
				{#each plan.recipes as recipe}
					<div class="flex items-center gap-3 bg-white rounded-xl border border-warm-200 p-3">
						{#if recipe.image_url}
							<img src={recipe.image_url} alt="" class="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
						{/if}
						<div>
							<div class="font-medium text-warm-900 text-sm">{recipe.name}</div>
							<div class="text-xs text-warm-500">{recipe.cuisine}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="mb-6">
			<h2 class="text-sm font-semibold text-warm-600 mb-2">Teilnehmer</h2>
			<div class="flex flex-wrap gap-2">
				{#each plan.persons as person}
					<span class="bg-orange-100 text-orange-700 text-sm font-medium px-3 py-1 rounded-full">{person.name}</span>
				{/each}
			</div>
		</div>

		<button
			onclick={startVoting}
			class="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors"
		>
			Abstimmung starten
		</button>

	{:else if phase === 'voting'}
		{@const person = currentPerson()}
		<div class="text-center mt-6 mb-2">
			<h1 class="text-2xl font-bold text-warm-900">{person?.name} ist dran</h1>
			<p class="text-sm text-warm-500 mt-1">Bewerte jedes Rezept mit 1-5 Sternen</p>
		</div>

		<div class="space-y-4 mt-6">
			{#each plan.recipes as recipe}
				<div class="bg-white rounded-xl border border-warm-200 p-4">
					<div class="flex items-center gap-3 mb-3">
						{#if recipe.image_url}
							<img src={recipe.image_url} alt="" class="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
						{/if}
						<div>
							<div class="font-semibold text-warm-900">{recipe.name}</div>
							<div class="text-xs text-warm-500">{recipe.cuisine}</div>
						</div>
					</div>
					<div class="flex justify-center gap-2">
						{#each [1, 2, 3, 4, 5] as star}
							<button
								onclick={() => setRating(recipe.id, star)}
								class="w-10 h-10 transition-transform hover:scale-110"
								aria-label="{star} Sterne"
							>
								<svg viewBox="0 0 24 24" class="w-full h-full {(ratings[recipe.id] || 0) >= star ? 'text-orange-500 fill-current' : 'text-warm-300'}">
									{#if (ratings[recipe.id] || 0) >= star}
										<path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
									{:else}
										<path fill="none" stroke="currentColor" stroke-width="1.5" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
									{/if}
								</svg>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<button
			onclick={submitVote}
			disabled={!allRated() || submitting}
			class="w-full mt-6 bg-orange-500 hover:bg-orange-600 disabled:bg-warm-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
		>
			{submitting ? 'Wird gespeichert...' : 'Fertig'}
		</button>

	{:else if phase === 'handoff'}
		{@const next = nextPerson()}
		<div class="text-center mt-20">
			<div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
				<svg class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
				</svg>
			</div>
			<h1 class="text-2xl font-bold text-warm-900 mb-2">Weitergeben!</h1>
			<p class="text-warm-600 text-lg">Gib das Handy an <strong class="text-orange-600">{next?.name}</strong></p>
			<button
				onclick={nextVoter}
				class="mt-8 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
			>
				Bereit
			</button>
		</div>

	{:else if phase === 'result'}
		{@const results = getResults()}
		<h1 class="text-2xl font-bold text-warm-900 mt-6 mb-6">Ergebnis</h1>

		<div class="space-y-4">
			{#each results as { recipe, avg, total }, i}
				<div class="bg-white rounded-xl border {i === 0 ? 'border-orange-400 border-2 shadow-md' : 'border-warm-200'} p-4">
					<div class="flex items-center gap-3">
						{#if i === 0}
							<div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
								<svg class="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
									<path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
								</svg>
							</div>
						{/if}
						{#if recipe.image_url}
							<img src={recipe.image_url} alt="" class="{i === 0 ? 'w-16 h-16' : 'w-12 h-12'} rounded-lg object-cover flex-shrink-0" />
						{/if}
						<div class="flex-1">
							<div class="font-semibold text-warm-900 {i === 0 ? 'text-lg' : 'text-sm'}">{recipe.name}</div>
							<div class="flex items-center gap-1 mt-1">
								{#each [1, 2, 3, 4, 5] as star}
									<svg class="w-4 h-4 {avg >= star ? 'text-orange-500' : avg >= star - 0.5 ? 'text-orange-300' : 'text-warm-300'}" viewBox="0 0 24 24" fill="currentColor">
										<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
									</svg>
								{/each}
								<span class="text-sm font-semibold text-warm-700 ml-1">{avg.toFixed(1)}</span>
								<span class="text-xs text-warm-400">({total})</span>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<button
			onclick={finish}
			class="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors"
		>
			Fertig
		</button>
	{/if}
</div>
