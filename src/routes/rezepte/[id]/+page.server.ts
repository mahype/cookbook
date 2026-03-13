import { error } from '@sveltejs/kit';
import { getDb, parseRecipe, getPantryItems } from '$lib/server/db';
import type { RecipeRow } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const row = db.prepare('SELECT * FROM recipes WHERE id = ?').get(params.id) as RecipeRow | undefined;

	if (!row) {
		error(404, 'Rezept nicht gefunden');
	}

	const recipe = parseRecipe(row);

	const pantryItems = getPantryItems();
	const pantryNames = pantryItems.map((p) => p.name.toLowerCase());

	// Find related recipes by shared shopping tags
	let related: ReturnType<typeof parseRecipe>[] = [];
	if (recipe.shopping_tags.length > 0) {
		const allApproved = db
			.prepare("SELECT * FROM recipes WHERE status = 'approved' AND id != ?")
			.all(params.id) as RecipeRow[];

		related = allApproved
			.map(parseRecipe)
			.map((r) => ({
				...r,
				_sharedTags: r.shopping_tags.filter((t) => recipe.shopping_tags.includes(t)).length
			}))
			.filter((r) => r._sharedTags > 0)
			.sort((a, b) => b._sharedTags - a._sharedTags)
			.slice(0, 3);
	}

	return { recipe, related, pantryNames };
};
