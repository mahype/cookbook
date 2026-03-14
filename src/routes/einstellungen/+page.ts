import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	return data ?? {
		cuisinePreferences: {},
		recipeNotes: '',
		defaultServings: 2,
		aiProvider: null
	};
};
