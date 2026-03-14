import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	return data ?? {
		tab: 'vorschlaege',
		date: new Date().toISOString().split('T')[0],
		suggestionRecipes: [],
		recipes: [],
		pantryNames: [],
		sort: 'newest',
		filters: {
			cuisines: [],
			stores: [],
			current: {
				cuisine: '',
				store: '',
				maxTime: ''
			}
		}
	};
};
