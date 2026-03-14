<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="min-h-screen bg-warm-50 flex items-center justify-center px-6">
	<div class="text-center max-w-sm">
		<svg class="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
		</svg>
		<h1 class="text-2xl font-bold text-warm-900 mb-2">{page.status}</h1>
		<p class="text-warm-600 mb-4">{page.error?.message ?? 'Ein unerwarteter Fehler ist aufgetreten.'}</p>
		<a href="/rezepte" class="inline-block px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors">
			Zurück zur Startseite
		</a>
	</div>
</div>
