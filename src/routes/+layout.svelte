<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let { children } = $props();
	let shoppingCount = $state(0);

	async function fetchShoppingCount() {
		try {
			const res = await fetch('/api/einkaufsliste/count');
			if (res.ok) {
				const data = await res.json();
				shoppingCount = data.count;
			}
		} catch {
			// ignore
		}
	}

	onMount(() => {
		fetchShoppingCount();
		const interval = setInterval(fetchShoppingCount, 5000);
		return () => clearInterval(interval);
	});

	// Refresh count on navigation
	$effect(() => {
		void $page.url.pathname;
		fetchShoppingCount();
	});
</script>

<svelte:head>
	<title>Rezept-App</title>
	<meta name="description" content="Deine täglichen Rezeptvorschläge und Rezeptsammlung" />
</svelte:head>

<div class="min-h-screen flex flex-col bg-warm-50">
	<main class="flex-1 pb-20">
		{@render children()}
	</main>

	<nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-warm-200 z-50 safe-area-bottom">
		<div class="flex justify-around items-center max-w-lg mx-auto">
			<a href="/vorschlaege" class="flex flex-col items-center min-h-[52px] min-w-[56px] justify-center py-2 px-2 text-warm-600 hover:text-spice-500 transition-colors">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
				</svg>
				<span class="text-xs mt-1 font-medium">Vorschläge</span>
			</a>
			<a href="/rezepte" class="flex flex-col items-center min-h-[52px] min-w-[56px] justify-center py-2 px-2 text-warm-600 hover:text-spice-500 transition-colors">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
				</svg>
				<span class="text-xs mt-1 font-medium">Rezepte</span>
			</a>
			<a href="/einkaufsliste" class="flex flex-col items-center min-h-[52px] min-w-[56px] justify-center py-2 px-2 text-warm-600 hover:text-spice-500 transition-colors relative">
				<div class="relative">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
					</svg>
					{#if shoppingCount > 0}
						<span class="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-spice-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
							{shoppingCount > 99 ? '99+' : shoppingCount}
						</span>
					{/if}
				</div>
				<span class="text-xs mt-1 font-medium">Einkaufen</span>
			</a>
			<a href="/vorrat" class="flex flex-col items-center min-h-[52px] min-w-[56px] justify-center py-2 px-2 text-warm-600 hover:text-spice-500 transition-colors">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
				</svg>
				<span class="text-xs mt-1 font-medium">Vorrat</span>
			</a>
			<a href="/personen" class="flex flex-col items-center min-h-[52px] min-w-[56px] justify-center py-2 px-2 text-warm-600 hover:text-spice-500 transition-colors">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
				<span class="text-xs mt-1 font-medium">Personen</span>
			</a>
			<a href="/einstellungen" class="flex flex-col items-center min-h-[52px] min-w-[56px] justify-center py-2 px-2 text-warm-600 hover:text-spice-500 transition-colors">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				<span class="text-xs mt-1 font-medium">Einstellungen</span>
			</a>
		</div>
	</nav>
</div>

<style>
	.safe-area-bottom {
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}
</style>
