import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AIProvider } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request }) => {
	const { provider } = (await request.json()) as { provider: AIProvider };

	if (!provider?.id || !provider?.baseUrl || !provider?.model) {
		return json({ success: false, error: 'Unvollständige Konfiguration' }, { status: 400 });
	}

	try {
		let text: string;
		let model: string;

		if (provider.id === 'anthropic') {
			const res = await fetch(`${provider.baseUrl}/messages`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': provider.apiKey,
					'anthropic-version': '2023-06-01'
				},
				body: JSON.stringify({
					model: provider.model,
					max_tokens: 32,
					messages: [{ role: 'user', content: 'Antworte mit OK' }]
				})
			});
			if (!res.ok) {
				const err = await res.text();
				return json({ success: false, error: `API-Fehler ${res.status}: ${err}` });
			}
			const data = await res.json();
			text = data.content[0].text;
			model = data.model ?? provider.model;
		} else {
			const headers: Record<string, string> = { 'Content-Type': 'application/json' };
			if (provider.apiKey) headers['Authorization'] = `Bearer ${provider.apiKey}`;

			const res = await fetch(`${provider.baseUrl}/chat/completions`, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					model: provider.model,
					max_tokens: 32,
					messages: [{ role: 'user', content: 'Antworte mit OK' }]
				})
			});
			if (!res.ok) {
				const err = await res.text();
				return json({ success: false, error: `API-Fehler ${res.status}: ${err}` });
			}
			const data = await res.json();
			text = data.choices[0].message.content;
			model = data.model ?? provider.model;
		}

		return json({ success: true, model, response: text });
	} catch (e) {
		return json({ success: false, error: e instanceof Error ? e.message : 'Unbekannter Fehler' });
	}
};
