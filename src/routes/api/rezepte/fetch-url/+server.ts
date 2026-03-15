import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { url } = await request.json();
	
	if (!url || typeof url !== 'string') {
		return json({ error: 'URL fehlt' }, { status: 400 });
	}

	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; Cokko/1.0; +https://cokko.app)',
				'Accept': 'text/html,application/xhtml+xml',
				'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8'
			}
		});

		if (!res.ok) {
			return json({ error: `HTTP ${res.status}` }, { status: 502 });
		}

		const content = await res.text();
		return json({ content });
	} catch (e: any) {
		return json({ error: e.message || 'Fetch failed' }, { status: 502 });
	}
};
