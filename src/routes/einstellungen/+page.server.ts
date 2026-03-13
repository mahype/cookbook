import { getPreference } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const raw = getPreference('cuisine_preferences');
	const cuisinePreferences: string[] = raw ? JSON.parse(raw) : [];
	return { cuisinePreferences };
};
