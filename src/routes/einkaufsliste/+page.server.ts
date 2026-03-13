import { getDb } from '$lib/server/db';
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

export const load: PageServerLoad = async () => {
	const db = getDb();
	const items = db
		.prepare('SELECT * FROM shopping_list ORDER BY checked ASC, created_at DESC')
		.all() as ShoppingItem[];

	return { items };
};
