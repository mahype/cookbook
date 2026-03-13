import { getDb, getPantryItems } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export type ShoppingItem = {
	id: number;
	ingredient_name: string;
	ingredient_amount: string;
	recipe_name: string;
	store: string;
	estimated_price: number;
	checked: number;
	created_at: string;
};

export const load: PageServerLoad = async ({ url }) => {
	const db = getDb();
	const tab = url.searchParams.get('tab') || 'einkaufsliste';

	const shoppingItems = db
		.prepare('SELECT * FROM shopping_list ORDER BY checked ASC, created_at DESC')
		.all() as ShoppingItem[];

	const pantryItems = getPantryItems();

	return { tab, shoppingItems, pantryItems };
};
