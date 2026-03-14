<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { isCapacitor, loadPreferences } from '$lib/stores/data';

	let { children } = $props();
	let shoppingCount = $state(0);
	let showSplash = $state(true);
	let splashFading = $state(false);
	let appReady = $state(false);

	// Pages that should hide the nav bar
	let hideNav = $derived(
		$page.url.pathname.startsWith('/onboarding') ||
		$page.url.pathname.startsWith('/planen/')
	);

	async function fetchShoppingCount() {
		try {
			if (isCapacitor()) {
				const { getShoppingCount } = await import('$lib/client/db');
				shoppingCount = await getShoppingCount();
			} else {
				const res = await fetch('/api/einkaufsliste/count');
				if (res.ok) {
					const data = await res.json();
					shoppingCount = data.count;
				}
			}
		} catch {
			// ignore
		}
	}

	async function checkOnboarding(): Promise<boolean> {
		try {
			if (isCapacitor()) {
				const prefs = await loadPreferences();
				// Show wizard if no AI provider configured
				return !prefs.aiProvider || !prefs.aiProvider.id;
			} else {
				const res = await fetch('/api/einstellungen');
				if (res.ok) {
					const data = await res.json();
					return !data.ai_provider && !data.aiProvider;
				}
				return false;
			}
		} catch {
			return false;
		}
	}

	onMount(async () => {
		// Show splash for 1.5 seconds
		setTimeout(() => {
			splashFading = true;
			setTimeout(async () => {
				showSplash = false;

				// Check if onboarding needed
				const needsOnboarding = await checkOnboarding();
				if (needsOnboarding && !$page.url.pathname.startsWith('/onboarding')) {
					goto('/onboarding');
				}

				appReady = true;
			}, 400);
		}, 1200);

		fetchShoppingCount();
		const interval = setInterval(fetchShoppingCount, 5000);
		return () => clearInterval(interval);
	});

	// Refresh count on navigation (only after app is ready)
	$effect(() => {
		void $page.url.pathname;
		if (appReady) fetchShoppingCount();
	});
</script>

<svelte:head>
	<title>Cokko</title>
	<meta name="description" content="Dein persönliches KI-Kochbuch" />
</svelte:head>

<!-- Splash Screen -->
{#if showSplash}
	<div class="fixed inset-0 z-[200] bg-orange-500 flex items-center justify-center transition-opacity duration-400 {splashFading ? 'opacity-0' : 'opacity-100'}">
		<div class="flex flex-col items-center gap-4">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-28 h-28 drop-shadow-lg">
				<rect width="512" height="512" rx="112" fill="white" opacity="0.2"/>
				<path d="M136 240 h240 v20 c0 80 -40 140 -120 150 c-80 -10 -120 -70 -120 -150 z" fill="white"/>
				<rect x="120" y="228" width="272" height="24" rx="12" fill="white"/>
				<rect x="96" y="236" width="40" height="12" rx="6" fill="white"/>
				<rect x="376" y="236" width="40" height="12" rx="6" fill="white"/>
				<circle cx="256" cy="210" r="14" fill="white"/>
				<path d="M220 190 c0-20 -15-30 -15-50 c0-15 15-25 15-45" fill="none" stroke="white" stroke-width="10" stroke-linecap="round"/>
				<path d="M256 180 c0-20 -15-30 -15-50 c0-15 15-25 15-45" fill="none" stroke="white" stroke-width="10" stroke-linecap="round"/>
				<path d="M292 190 c0-20 -15-30 -15-50 c0-15 15-25 15-45" fill="none" stroke="white" stroke-width="10" stroke-linecap="round"/>
			</svg>
			<span class="text-white text-3xl font-bold tracking-wide">Cokko</span>
		</div>
	</div>
{/if}

<div class="min-h-screen flex flex-col bg-warm-50">
	<main class="flex-1 {hideNav ? '' : 'pb-20'} pt-[env(safe-area-inset-top)]">
		{@render children()}
	</main>

	{#if !hideNav}
	<nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-warm-200 z-50 safe-area-bottom">
		<div class="flex justify-around items-center max-w-lg mx-auto">
			<a href="/rezepte" class="flex flex-col items-center min-h-[52px] min-w-[56px] justify-center py-2 px-2 transition-colors {$page.url.pathname.startsWith('/rezepte') ? 'text-spice-500' : 'text-warm-600 hover:text-spice-500'}">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
				</svg>
				<span class="text-xs mt-1 font-medium">Rezepte</span>
			</a>
			<a href="/lebensmittel" class="flex flex-col items-center min-h-[52px] min-w-[56px] justify-center py-2 px-2 transition-colors relative {$page.url.pathname.startsWith('/lebensmittel') ? 'text-spice-500' : 'text-warm-600 hover:text-spice-500'}">
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
				<span class="text-xs mt-1 font-medium">Lebensmittel</span>
			</a>
			<a href="/einstellungen" class="flex flex-col items-center min-h-[52px] min-w-[56px] justify-center py-2 px-2 transition-colors {$page.url.pathname.startsWith('/einstellungen') ? 'text-spice-500' : 'text-warm-600 hover:text-spice-500'}">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				<span class="text-xs mt-1 font-medium">Einstellungen</span>
			</a>
		</div>
	</nav>
	{/if}
</div>

<style>
	.safe-area-bottom {
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}
</style>
