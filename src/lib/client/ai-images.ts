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

// --- Unsplash: Free stock photo search ---

export async function searchUnsplashImage(
	query: string,
	apiKey: string
): Promise<string | null> {
	if (!apiKey) return null;

	try {
		const searchQuery = `${query} food`;
		const res = await fetch(
			`https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=5&orientation=squarish`,
			{ headers: { Authorization: `Client-ID ${apiKey}` } }
		);
		if (!res.ok) return null;
		const data = await res.json();

		if (data.results && data.results.length > 0) {
			// Use small size (good quality, fast loading)
			return data.results[0].urls.small;
		}
		return null;
	} catch {
		return null;
	}
}

// --- Combined: search first, then generate ---

export async function findOrGenerateImage(
	recipeName: string,
	pexelsKey: string,
	openaiKey: string,
	unsplashKey: string = '',
	onStatus?: (status: string) => void
): Promise<string | null> {
	// 1. Try Pexels first (free)
	if (pexelsKey) {
		onStatus?.('Suche Foto (Pexels)...');
		const pexelsUrl = await searchPexelsImage(recipeName, pexelsKey);
		if (pexelsUrl) return pexelsUrl;
	}

	// 2. Try Unsplash (free)
	if (unsplashKey) {
		onStatus?.('Suche Foto (Unsplash)...');
		const unsplashUrl = await searchUnsplashImage(recipeName, unsplashKey);
		if (unsplashUrl) return unsplashUrl;
	}

	// 3. Fall back to DALL-E (paid)
	if (openaiKey) {
		onStatus?.('Generiere Foto...');
		const dalleUrl = await generateRecipeImage(recipeName, openaiKey);
		if (dalleUrl) return dalleUrl;
	}

	// 4. No image available
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
