<script lang="ts">
	import { goto } from '$app/navigation';
	import StepIndicator from '$lib/components/StepIndicator.svelte';
	import type { Person } from '$lib/server/db';

	let persons = $state<Person[]>([]);
	let loading = $state(true);
	let selectedIds = $state<Set<number>>(new Set());
	let creating = $state(false);

	async function fetchPersons() {
		try {
			const res = await fetch('/api/personen');
			if (res.ok) {
				const data = await res.json();
				persons = data.persons;
			}
		} catch {
			// ignore
		} finally {
			loading = false;
		}
	}

	fetchPersons();

	function togglePerson(id: number) {
		const next = new Set(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedIds = next;
	}

	const household = $derived(persons.filter((p) => p.is_household === 1));
	const guests = $derived(persons.filter((p) => p.is_household === 0));
	const hasSelection = $derived(selectedIds.size > 0);

	async function handleWeiter() {
		if (!hasSelection || creating) return;
		creating = true;
		try {
			const res = await fetch('/api/planen', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ person_ids: Array.from(selectedIds) })
			});
			if (res.ok) {
				const data = await res.json();
				goto(`/planen/${data.meal_plan.id}`);
			}
		} catch {
			// ignore
		} finally {
			creating = false;
		}
	}
</script>

<div class="max-w-lg mx-auto px-4 pt-6 pb-32">
	<StepIndicator current={1} />

	<header class="mb-5">
		<h1 class="text-2xl font-bold text-warm-900">Essen planen</h1>
		<p class="text-warm-500 text-sm mt-1">Wer isst mit?</p>
	</header>

	{#if loading}
		<div class="text-center py-16 text-warm-500">Laden...</div>
	{:else if persons.length === 0}
		<div class="text-center py-16">
			<svg class="w-12 h-12 mx-auto text-warm-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
			</svg>
			<p class="text-warm-500 mb-4">Noch keine Personen angelegt</p>
			<a href="/personen" class="inline-block bg-spice-500 hover:bg-spice-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
				Personen anlegen
			</a>
		</div>
	{:else}
		<!-- Household members -->
		{#if household.length > 0}
			<div class="space-y-3 mb-4">
				{#each household as person (person.id)}
					<button
						onclick={() => togglePerson(person.id)}
						class="w-full text-left bg-white rounded-2xl border-2 shadow-sm p-4 transition-all duration-150
							{selectedIds.has(person.id) ? 'border-spice-500 ring-1 ring-spice-200' : 'border-warm-100 hover:border-warm-200'}"
					>
						<div class="flex items-center gap-3">
							<!-- Selection indicator -->
							<div class="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
								{selectedIds.has(person.id) ? 'bg-spice-500 border-spice-500' : 'border-warm-300'}">
								{#if selectedIds.has(person.id)}
									<svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
									</svg>
								{/if}
							</div>

							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<span class="font-semibold text-warm-900">{person.name}</span>
									<span class="text-[11px] font-medium bg-warm-100 text-warm-600 px-2 py-0.5 rounded-full">Haushalt</span>
								</div>
								{#if person.likes.length > 0 || person.dislikes.length > 0 || person.allergies.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each person.likes as tag}
											<span class="text-[10px] font-medium bg-herb-100 text-herb-800 px-1.5 py-0.5 rounded-full">{tag}</span>
										{/each}
										{#each person.dislikes as tag}
											<span class="text-[10px] font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{tag}</span>
										{/each}
										{#each person.allergies as tag}
											<span class="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{tag}</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}

		<!-- Guests -->
		{#if guests.length > 0}
			<div class="flex items-center gap-2 mb-3 mt-6">
				<div class="h-px flex-1 bg-warm-200"></div>
				<span class="text-xs font-semibold text-warm-400 uppercase tracking-wider">Gäste</span>
				<div class="h-px flex-1 bg-warm-200"></div>
			</div>

			<div class="space-y-3">
				{#each guests as person (person.id)}
					<button
						onclick={() => togglePerson(person.id)}
						class="w-full text-left bg-white rounded-2xl border-2 shadow-sm p-4 transition-all duration-150
							{selectedIds.has(person.id) ? 'border-spice-500 ring-1 ring-spice-200' : 'border-warm-100 hover:border-warm-200'}"
					>
						<div class="flex items-center gap-3">
							<div class="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
								{selectedIds.has(person.id) ? 'bg-spice-500 border-spice-500' : 'border-warm-300'}">
								{#if selectedIds.has(person.id)}
									<svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
									</svg>
								{/if}
							</div>

							<div class="flex-1 min-w-0">
								<span class="font-semibold text-warm-900">{person.name}</span>
								{#if person.likes.length > 0 || person.dislikes.length > 0 || person.allergies.length > 0}
									<div class="flex flex-wrap gap-1 mt-1">
										{#each person.likes as tag}
											<span class="text-[10px] font-medium bg-herb-100 text-herb-800 px-1.5 py-0.5 rounded-full">{tag}</span>
										{/each}
										{#each person.dislikes as tag}
											<span class="text-[10px] font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{tag}</span>
										{/each}
										{#each person.allergies as tag}
											<span class="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{tag}</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- Bottom "Weiter" button -->
{#if hasSelection}
	<div class="fixed bottom-20 left-0 right-0 p-4 z-30">
		<div class="max-w-lg mx-auto">
			<button
				onclick={handleWeiter}
				disabled={creating}
				class="w-full bg-spice-500 hover:bg-spice-600 disabled:opacity-60 text-white py-4 rounded-2xl text-base font-semibold shadow-lg transition-colors"
			>
				{creating ? 'Wird erstellt...' : `Weiter mit ${selectedIds.size} Person${selectedIds.size !== 1 ? 'en' : ''}`}
			</button>
		</div>
	</div>
{/if}
