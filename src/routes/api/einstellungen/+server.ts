import { json } from '@sveltejs/kit';
import { getPreference, setPreference } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const raw = getPreference('cuisine_preferences');
	const cuisine_preferences: string[] = raw ? JSON.parse(raw) : [];
	return json({ cuisine_preferences });
};

export const PUT: RequestHandler = async ({ request }) => {
	const { cuisine_preferences } = await request.json();

	if (!Array.isArray(cuisine_preferences)) {
		return json({ error: 'cuisine_preferences muss ein Array sein' }, { status: 400 });
	}

	setPreference('cuisine_preferences', JSON.stringify(cuisine_preferences));
	return json({ cuisine_preferences });
};
