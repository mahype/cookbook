<script>
	import '../app.css';

	let { children } = $props();
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
			<a href="/vorschlaege" class="flex flex-col items-center min-h-[52px] min-w-[64px] justify-center py-2 px-3 text-warm-600 hover:text-spice-500 transition-colors">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
				</svg>
				<span class="text-xs mt-1 font-medium">Vorschläge</span>
			</a>
			<a href="/rezepte" class="flex flex-col items-center min-h-[52px] min-w-[64px] justify-center py-2 px-3 text-warm-600 hover:text-spice-500 transition-colors">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
				</svg>
				<span class="text-xs mt-1 font-medium">Rezepte</span>
			</a>
			<a href="/vorrat" class="flex flex-col items-center min-h-[52px] min-w-[64px] justify-center py-2 px-3 text-warm-600 hover:text-spice-500 transition-colors">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
				</svg>
				<span class="text-xs mt-1 font-medium">Vorrat</span>
			</a>
			<a href="/einstellungen" class="flex flex-col items-center min-h-[52px] min-w-[64px] justify-center py-2 px-3 text-warm-600 hover:text-spice-500 transition-colors">
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
