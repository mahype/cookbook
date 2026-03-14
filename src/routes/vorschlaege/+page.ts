import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	return data ?? {
		date: new Date().toISOString().split('T')[0],
		recipes: [],
		pantryNames: []
	};
};
