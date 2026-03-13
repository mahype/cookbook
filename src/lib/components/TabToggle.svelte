<script lang="ts">
	type Tab = { value: string; label: string };

	let {
		tabs,
		active,
		onChange
	}: {
		tabs: Tab[];
		active: string;
		onChange: (value: string) => void;
	} = $props();
</script>

<div class="flex gap-2 justify-center mb-4">
	{#each tabs as tab}
		<button
			onclick={() => onChange(tab.value)}
			class="rounded-full px-5 py-2 text-sm font-semibold transition-colors {active === tab.value
				? 'bg-orange-500 text-white'
				: 'bg-white border border-warm-200 text-warm-600 hover:text-warm-800'}"
		>
			{tab.label}
		</button>
	{/each}
</div>
