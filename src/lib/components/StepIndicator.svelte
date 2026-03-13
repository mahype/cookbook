<script lang="ts">
	let { current = 1 }: { current: number } = $props();

	const steps = [
		{ label: 'Personen', step: 1 },
		{ label: 'Rezepte', step: 2 },
		{ label: 'Abstimmung', step: 3 }
	];
</script>

<div class="flex items-center justify-center gap-2 mb-6">
	{#each steps as s, i}
		{#if i > 0}
			<div class="w-8 h-px {current > s.step - 1 ? 'bg-spice-400' : 'bg-warm-200'}"></div>
		{/if}
		<div class="flex flex-col items-center gap-1">
			<div
				class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
					{current === s.step ? 'bg-spice-500 text-white' : current > s.step ? 'bg-herb-500 text-white' : 'bg-warm-200 text-warm-500'}"
			>
				{#if current > s.step}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
					</svg>
				{:else}
					{s.step}
				{/if}
			</div>
			<span class="text-[10px] font-medium {current >= s.step ? 'text-warm-700' : 'text-warm-400'}">{s.label}</span>
		</div>
	{/each}
</div>
