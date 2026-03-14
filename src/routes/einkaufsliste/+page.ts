import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	return data ?? {
		tab: 'einkaufsliste',
		shoppingItems: [],
		pantryItems: []
	};
};
