import { json } from '@sveltejs/kit';
import { getPreference, setPreference } from '$lib/server/db';
import type { RequestHandler } from './$types';

function loadCuisinePreferences(): Record<string, number> {
	const raw = getPreference('cuisine_preferences');
	if (!raw) return {};
	const parsed = JSON.parse(raw);
	if (Array.isArray(parsed)) {
		const obj: Record<string, number> = {};
		for (const c of parsed) obj[c] = 2;
		return obj;
	}
	return parsed;
}

export const GET: RequestHandler = async () => {
	const cuisine_preferences = loadCuisinePreferences();
	const recipe_notes = getPreference('recipe_notes') ?? '';
	const default_servings = parseInt(getPreference('default_servings') ?? '2', 10);
	const ai_provider = JSON.parse(getPreference('ai_provider') ?? 'null');
	const health_conditions = JSON.parse(getPreference('health_conditions') ?? '[]');
	return json({ cuisine_preferences, recipe_notes, default_servings, ai_provider, healthConditions: health_conditions });
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if ('cuisine_preferences' in body) {
		let prefs: Record<string, number>;
		if (Array.isArray(body.cuisine_preferences)) {
			// Accept old array format for backwards compat
			prefs = {};
			for (const c of body.cuisine_preferences) prefs[c] = 2;
		} else if (typeof body.cuisine_preferences === 'object' && body.cuisine_preferences !== null) {
			prefs = body.cuisine_preferences;
		} else {
			return json({ error: 'cuisine_preferences muss ein Array oder Objekt sein' }, { status: 400 });
		}
		setPreference('cuisine_preferences', JSON.stringify(prefs));
	}

	if ('default_servings' in body) {
		const val = parseInt(body.default_servings, 10);
		if (isNaN(val) || val < 1 || val > 12) {
			return json({ error: 'default_servings muss zwischen 1 und 12 liegen' }, { status: 400 });
		}
		setPreference('default_servings', String(val));
	}

	if ('recipe_notes' in body) {
		if (typeof body.recipe_notes !== 'string') {
			return json({ error: 'recipe_notes muss ein String sein' }, { status: 400 });
		}
		setPreference('recipe_notes', body.recipe_notes);
	}

	if ('health_conditions' in body) {
		if (Array.isArray(body.health_conditions)) {
			setPreference('health_conditions', JSON.stringify(body.health_conditions));
		} else {
			return json({ error: 'health_conditions muss ein Array sein' }, { status: 400 });
		}
	}

	if ('ai_provider' in body) {
		if (body.ai_provider === null) {
			setPreference('ai_provider', 'null');
		} else if (typeof body.ai_provider === 'object') {
			setPreference('ai_provider', JSON.stringify(body.ai_provider));
		} else {
			return json({ error: 'ai_provider muss ein Objekt oder null sein' }, { status: 400 });
		}
	}

	const cuisine_preferences = loadCuisinePreferences();
	const recipe_notes = getPreference('recipe_notes') ?? '';
	const default_servings = parseInt(getPreference('default_servings') ?? '2', 10);
	const ai_provider = JSON.parse(getPreference('ai_provider') ?? 'null');
	const health_conditions = JSON.parse(getPreference('health_conditions') ?? '[]');
	return json({ cuisine_preferences, recipe_notes, default_servings, ai_provider, healthConditions: health_conditions });
};
