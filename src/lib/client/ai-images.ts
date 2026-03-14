import type { AIProviderConfig } from './ai-recipes';

export async function generateRecipeImage(
	recipeName: string,
	apiKey: string
): Promise<string | null> {
	if (!apiKey) return null;

	try {
		const res = await fetch('https://api.openai.com/v1/images/generations', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: 'dall-e-3',
				prompt: `Professional food photography: ${recipeName}. Overhead shot, natural daylight, appetizing presentation on ceramic plate, wooden table, garnished, sharp focus, no text or watermarks.`,
				n: 1,
				size: '1024x1024',
				quality: 'standard',
				response_format: 'url'
			})
		});
		if (!res.ok) return null;
		const data = await res.json();
		return data.data[0]?.url ?? null;
	} catch {
		return null;
	}
}

export async function validateRecipeImage(
	recipeName: string,
	imageUrl: string,
	provider: AIProviderConfig
): Promise<boolean> {
	// Skip validation if no vision-capable provider
	if (!provider.apiKey || provider.id === 'ollama') return true;

	try {
		const messages = [
			{
				role: 'user' as const,
				content: [
					{
						type: 'text' as const,
						text: `Zeigt dieses Bild das Gericht "${recipeName}"? Antworte NUR mit JA oder NEIN.`
					},
					{ type: 'image_url' as const, image_url: { url: imageUrl } }
				]
			}
		];

		if (provider.id === 'anthropic') {
			// Anthropic vision format is different - skip validation for now
			return true;
		}

		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (provider.apiKey) headers['Authorization'] = `Bearer ${provider.apiKey}`;

		const res = await fetch(provider.baseUrl + '/chat/completions', {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model: provider.model,
				max_tokens: 10,
				messages
			})
		});
		if (!res.ok) return true; // dont block on validation failure
		const data = await res.json();
		const answer = data.choices[0]?.message?.content?.trim().toUpperCase();
		return answer?.startsWith('JA') ?? true;
	} catch {
		return true;
	}
}
