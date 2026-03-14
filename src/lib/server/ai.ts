import { getPreference } from '$lib/server/db';

export interface AIProvider {
	id: string;
	name: string;
	baseUrl: string;
	model: string;
	apiKey: string;
}

export interface AIResponse {
	text: string;
	provider: string;
	model: string;
}

export const providerDefaults: Record<string, { name: string; baseUrl: string; model: string }> = {
	openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
	anthropic: { name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
	mistral: { name: 'Mistral', baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-small-latest' },
	openrouter: { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'auto' },
	ollama: { name: 'Ollama', baseUrl: 'http://localhost:11434/v1', model: 'llama3.2' },
	custom: { name: 'Custom', baseUrl: '', model: '' }
};

export function getAIProvider(): AIProvider | null {
	const raw = getPreference('ai_provider');
	if (!raw) return null;
	return JSON.parse(raw);
}

async function chatCompletionOpenAI(provider: AIProvider, prompt: string, systemPrompt?: string): Promise<AIResponse> {
	const messages: { role: string; content: string }[] = [];
	if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
	messages.push({ role: 'user', content: prompt });

	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (provider.apiKey) headers['Authorization'] = `Bearer ${provider.apiKey}`;

	const res = await fetch(`${provider.baseUrl}/chat/completions`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ model: provider.model, messages })
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`API error ${res.status}: ${text}`);
	}

	const data = await res.json();
	return {
		text: data.choices[0].message.content,
		provider: provider.id,
		model: data.model ?? provider.model
	};
}

async function chatCompletionAnthropic(provider: AIProvider, prompt: string, systemPrompt?: string): Promise<AIResponse> {
	const body: Record<string, unknown> = {
		model: provider.model,
		max_tokens: 4096,
		messages: [{ role: 'user', content: prompt }]
	};
	if (systemPrompt) body.system = systemPrompt;

	const res = await fetch(`${provider.baseUrl}/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': provider.apiKey,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`API error ${res.status}: ${text}`);
	}

	const data = await res.json();
	return {
		text: data.content[0].text,
		provider: provider.id,
		model: data.model ?? provider.model
	};
}

export async function chatCompletion(prompt: string, systemPrompt?: string): Promise<AIResponse> {
	const provider = getAIProvider();
	if (!provider) throw new Error('No AI provider configured');

	if (provider.id === 'anthropic') {
		return chatCompletionAnthropic(provider, prompt, systemPrompt);
	}
	return chatCompletionOpenAI(provider, prompt, systemPrompt);
}
