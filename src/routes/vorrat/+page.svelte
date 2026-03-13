<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let items = $state(data.items);
	let newItem = $state('');
	let error = $state('');

	async function addItem() {
		const name = newItem.trim();
		if (!name) return;

		error = '';
		const res = await fetch('/api/vorrat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});

		if (res.ok) {
			const item = await res.json();
			items = [...items, item].sort((a, b) => a.name.localeCompare(b.name, 'de'));
			newItem = '';
		} else {
			const data = await res.json();
			error = data.error || 'Fehler beim Hinzufügen';
		}
	}

	async function removeItem(id: number) {
		await fetch('/api/vorrat', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id })
		});
		items = items.filter((i) => i.id !== id);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') addItem();
	}
</script>

<div class="max-w-lg mx-auto px-4 pt-6">
	<h1 class="text-2xl font-bold text-warm-900 mb-2">📦 Vorrat</h1>
	<p class="text-sm text-warm-500 mb-6">Zutaten die du zuhause hast – werden beim Einkaufen abgezogen.</p>

	<!-- Add Item -->
	<div class="flex gap-2 mb-6">
		<input
			type="text"
			bind:value={newItem}
			onkeydown={handleKeydown}
			placeholder="Zutat hinzufügen..."
			class="flex-1 px-4 py-3 rounded-xl border border-warm-200 bg-white text-base text-warm-800 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-spice-400 focus:border-transparent"
		/>
		<button
			onclick={addItem}
			disabled={!newItem.trim()}
			class="min-w-[48px] min-h-[48px] px-5 rounded-xl bg-spice-500 text-white text-lg font-semibold hover:bg-spice-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
		>
			+
		</button>
	</div>

	{#if error}
		<p class="text-sm text-red-600 mb-4 bg-red-50 px-4 py-2 rounded-xl">{error}</p>
	{/if}

	<!-- Pantry List -->
	<div class="bg-white rounded-2xl shadow-sm border border-warm-100">
		{#if items.length === 0}
			<p class="text-base text-warm-400 text-center py-8">Noch keine Vorräte eingetragen.</p>
		{:else}
			<ul class="divide-y divide-warm-100">
				{#each items as item (item.id)}
					<li class="flex items-center justify-between px-5 py-4">
						<span class="text-base text-warm-800 font-medium">{item.name}</span>
						<button
							onclick={() => removeItem(item.id)}
							class="text-warm-400 hover:text-red-500 transition-colors p-2.5 -mr-2"
							title="Entfernen"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<p class="text-xs text-warm-400 text-center mt-4">{items.length} Artikel im Vorrat</p>
</div>
