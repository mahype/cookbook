import type { AIProviderConfig } from './ai-recipes';

/**
 * Image search priority:
 * 1. Pexels (free stock photos, needs API key)
 * 2. DALL-E 3 (AI-generated, needs OpenAI key, ~0.04€/image)
 * 3. null (SVG placeholder)
 */

// --- Pexels: Free stock photo search ---

export async function searchPexelsImage(
	query: string,
	apiKey: string
): Promise<string | null> {
	if (!apiKey) return null;

	try {
		// Search with recipe name, add "food" for better results
		const searchQuery = `${query} food dish`;
		const res = await fetch(
			`https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=5&orientation=square`,
			{ headers: { Authorization: apiKey } }
		);
		if (!res.ok) return null;
		const data = await res.json();

		if (data.photos && data.photos.length > 0) {
			// Use medium size (good quality, reasonable size)
			return data.photos[0].src.medium;
		}
		return null;
	} catch {
		return null;
	}
}

// --- DALL-E 3: AI image generation ---

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

// --- Combined: search first, then generate ---

export async function findOrGenerateImage(
	recipeName: string,
	pexelsKey: string,
	openaiKey: string,
	onStatus?: (status: string) => void
): Promise<string | null> {
	// 1. Try Pexels first (free)
	if (pexelsKey) {
		onStatus?.('Suche Foto...');
		const pexelsUrl = await searchPexelsImage(recipeName, pexelsKey);
		if (pexelsUrl) return pexelsUrl;
	}

	// 2. Fall back to DALL-E (paid)
	if (openaiKey) {
		onStatus?.('Generiere Foto...');
		const dalleUrl = await generateRecipeImage(recipeName, openaiKey);
		if (dalleUrl) return dalleUrl;
	}

	// 3. No image available
	return null;
}

// Legacy export for backwards compatibility
export async function validateRecipeImage(
	_recipeName: string,
	_imageUrl: string,
	_provider: AIProviderConfig
): Promise<boolean> {
	return true;
}
