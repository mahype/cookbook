<script lang="ts">
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { PageData } from './$types';
	import type { ShoppingItem } from './+page.server';

	let { data }: { data: PageData } = $props();

	let items = $state<ShoppingItem[]>(data.items);
	let showClearAllDialog = $state(false);
	let toggling = $state<number | null>(null);
	let deleting = $state<number | null>(null);

	const storeEmojis: Record<string, string> = {
		Discounter: '🏪',
		Supermarkt: '🛒',
		Theke: '🥩',
		'Asia-Laden': '🌏',
		Gemüsehändler: '🥬'
	};

	const storeColors: Record<string, string> = {
		Discounter: 'bg-blue-100 text-blue-700 border-blue-200',
		Supermarkt: 'bg-purple-100 text-purple-700 border-purple-200',
		Gemüsehändler: 'bg-herb-100 text-herb-700 border-herb-200',
		'Asia-Laden': 'bg-red-100 text-red-700 border-red-200',
		Theke: 'bg-amber-100 text-amber-700 border-amber-200'
	};

	function formatPrice(price: number): string {
		return price.toFixed(2).replace('.', ',');
	}

	const uncheckedItems = $derived(items.filter((i) => !i.checked));
	const checkedItems = $derived(items.filter((i) => i.checked));

	const totalEstimated = $derived(
		uncheckedItems.reduce((sum, i) => sum + (i.estimated_price || 0), 0)
	);

	const storeOrder = ['Discounter', 'Supermarkt', 'Theke', 'Asia-Laden', 'Gemüsehändler', ''];

	const groupedUnchecked = $derived(() => {
		const groups: Record<string, ShoppingItem[]> = {};
		for (const item of uncheckedItems) {
			const store = item.store || 'Sonstiges';
			if (!groups[store]) groups[store] = [];
			groups[store].push(item);
		}
		return Object.entries(groups).sort(([a], [b]) => {
			const ai = storeOrder.indexOf(a);
			const bi = storeOrder.indexOf(b);
			return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
		});
	});

	async function toggleItem(id: number) {
		toggling = id;
		try {
			const res = await fetch(`/api/einkaufsliste/${id}`, { method: 'PATCH' });
			if (res.ok) {
				const data = await res.json();
				items = items.map((i) => (i.id === id ? { ...i, checked: data.checked } : i));
			}
		} finally {
			toggling = null;
		}
	}

	async function deleteItem(id: number) {
		deleting = id;
		try {
			const res = await fetch(`/api/einkaufsliste/${id}`, { method: 'DELETE' });
			if (res.ok) {
				items = items.filter((i) => i.id !== id);
			}
		} finally {
			deleting = null;
		}
	}

	async function clearChecked() {
		const res = await fetch('/api/einkaufsliste', { method: 'DELETE' });
		if (res.ok) {
			items = items.filter((i) => !i.checked);
		}
	}

	async function clearAll() {
		showClearAllDialog = false;
		const res = await fetch('/api/einkaufsliste?all=true', { method: 'DELETE' });
		if (res.ok) {
			items = [];
		}
	}
</script>

<div class="max-w-lg mx-auto px-4 pt-6 pb-4">
	<h1 class="text-2xl font-bold text-warm-900 mb-4">🛒 Einkaufsliste</h1>

	{#if items.length === 0}
		<div class="bg-white rounded-2xl p-8 shadow-sm border border-warm-100 text-center">
			<p class="text-4xl mb-3">🛒</p>
			<p class="text-warm-500 text-base">Deine Einkaufsliste ist leer.</p>
			<p class="text-warm-400 text-sm mt-1">Füge Zutaten aus deinen Rezepten hinzu!</p>
		</div>
	{:else}
		<!-- Total estimated price -->
		{#if totalEstimated > 0}
			<div class="bg-spice-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
				<span class="text-sm text-spice-700 font-medium">Geschätzte Gesamtkosten</span>
				<span class="text-lg font-bold text-spice-600">~{formatPrice(totalEstimated)} €</span>
			</div>
		{/if}

		<!-- Unchecked items grouped by store -->
		{#each groupedUnchecked() as [store, storeItems] (store)}
			<div class="mb-4">
				<h2 class="text-sm font-semibold text-warm-700 mb-2">
					{storeEmojis[store] || '📦'} {store}
				</h2>
				<div class="bg-white rounded-2xl shadow-sm border border-warm-100 divide-y divide-warm-100">
					{#each storeItems as item (item.id)}
						<div class="flex items-center gap-3 px-4 py-3 min-h-[56px]">
							<button
								onclick={() => toggleItem(item.id)}
								disabled={toggling === item.id}
								class="w-7 h-7 rounded-lg border-2 border-warm-300 flex items-center justify-center flex-shrink-0 hover:border-herb-500 transition-colors disabled:opacity-50"
							>
								{#if toggling === item.id}
									<span class="text-xs animate-pulse">···</span>
								{/if}
							</button>
							<div class="flex-1 min-w-0">
								<div class="flex items-baseline gap-1">
									<span class="text-base text-warm-800 font-medium">{item.ingredient_name}</span>
									<span class="text-sm text-warm-400">– {item.ingredient_amount}</span>
								</div>
								<span class="text-xs text-warm-400">{item.recipe_name}</span>
							</div>
							{#if item.estimated_price > 0}
								<span class="text-sm text-warm-500 whitespace-nowrap">~{formatPrice(item.estimated_price)} €</span>
							{/if}
							<button
								onclick={() => deleteItem(item.id)}
								disabled={deleting === item.id}
								class="w-8 h-8 rounded-full text-warm-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-50"
								title="Entfernen"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/each}

		<!-- Checked items -->
		{#if checkedItems.length > 0}
			<div class="mb-4">
				<h2 class="text-sm font-semibold text-warm-500 mb-2">✅ Erledigt ({checkedItems.length})</h2>
				<div class="bg-white rounded-2xl shadow-sm border border-warm-100 divide-y divide-warm-100">
					{#each checkedItems as item (item.id)}
						<div class="flex items-center gap-3 px-4 py-3 min-h-[56px] opacity-50">
							<button
								onclick={() => toggleItem(item.id)}
								disabled={toggling === item.id}
								class="w-7 h-7 rounded-lg border-2 border-herb-500 bg-herb-500 flex items-center justify-center flex-shrink-0 hover:bg-herb-600 transition-colors disabled:opacity-50"
							>
								{#if toggling === item.id}
									<span class="text-xs animate-pulse text-white">···</span>
								{:else}
									<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
									</svg>
								{/if}
							</button>
							<div class="flex-1 min-w-0">
								<span class="text-base text-warm-800 line-through">{item.ingredient_name}</span>
								<span class="text-sm text-warm-400 ml-1">– {item.ingredient_amount}</span>
							</div>
							<button
								onclick={() => deleteItem(item.id)}
								disabled={deleting === item.id}
								class="w-8 h-8 rounded-full text-warm-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-50"
								title="Entfernen"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					{/each}
				</div>
			</div>

			<!-- Clear checked button -->
			<button
				onclick={clearChecked}
				class="w-full min-h-[48px] py-3 rounded-xl border border-warm-200 text-warm-600 text-base font-medium hover:bg-warm-50 transition-colors mb-3"
			>
				Erledigte entfernen
			</button>
		{/if}

		<!-- Clear all button -->
		<button
			onclick={() => (showClearAllDialog = true)}
			class="w-full min-h-[48px] py-3 rounded-xl border border-red-200 text-red-500 text-base font-medium hover:bg-red-50 transition-colors mb-4"
		>
			Liste leeren
		</button>
	{/if}
</div>

<ConfirmDialog
	open={showClearAllDialog}
	title="Liste leeren?"
	message="Möchtest du wirklich alle Einträge von der Einkaufsliste entfernen?"
	confirmLabel="Ja, alles löschen"
	cancelLabel="Abbrechen"
	onConfirm={clearAll}
	onCancel={() => (showClearAllDialog = false)}
/>
