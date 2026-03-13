import { json } from '@sveltejs/kit';
import { getPreference, setPreference } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const raw = getPreference('cuisine_preferences');
	const cuisine_preferences: string[] = raw ? JSON.parse(raw) : [];
	const recipe_notes = getPreference('recipe_notes') ?? '';
	return json({ cuisine_preferences, recipe_notes });
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if ('cuisine_preferences' in body) {
		if (!Array.isArray(body.cuisine_preferences)) {
			return json({ error: 'cuisine_preferences muss ein Array sein' }, { status: 400 });
		}
		setPreference('cuisine_preferences', JSON.stringify(body.cuisine_preferences));
	}

	if ('recipe_notes' in body) {
		if (typeof body.recipe_notes !== 'string') {
			return json({ error: 'recipe_notes muss ein String sein' }, { status: 400 });
		}
		setPreference('recipe_notes', body.recipe_notes);
	}

	const raw = getPreference('cuisine_preferences');
	const cuisine_preferences: string[] = raw ? JSON.parse(raw) : [];
	const recipe_notes = getPreference('recipe_notes') ?? '';
	return json({ cuisine_preferences, recipe_notes });
};
