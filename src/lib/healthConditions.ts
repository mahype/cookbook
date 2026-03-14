export interface HealthCondition {
	id: string;
	label: string;
	icon: string; // SVG path(s) for a 24x24 viewBox
}

export const healthConditionOptions: HealthCondition[] = [
	{
		id: 'diabetes_typ1',
		label: 'Diabetes Typ 1',
		// syringe
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3l3 3m0 0l-7.5 7.5a2.12 2.12 0 003 3L15 9m-3-3l3-3m-3 3h3m-3 0V6m6 6l-3 3m0 0l-1.5 1.5M18 12l3 3m-3-3v3m0-3h-3"/>'
	},
	{
		id: 'diabetes_typ2',
		label: 'Diabetes Typ 2',
		// droplet
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21c-4-4-8-7.5-8-11a8 8 0 1116 0c0 3.5-4 7-8 11z"/>'
	},
	{
		id: 'laktoseintoleranz',
		label: 'Laktoseintoleranz',
		// cup/glass with X
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 2h8l-1 10H9L8 2zm-1 14h10M12 12v4m-4 4h8"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 5l-3 3m0-3l3 3" opacity="0.7"/>'
	},
	{
		id: 'glutenunvertraeglichkeit',
		label: 'Glutenunverträglichkeit / Zöliakie',
		// wheat with slash
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m-3-12c1.5 0 3 1 3 3m0-3c1.5 0 3 1 3 3m-6 2c1.5 0 3 1 3 3m0-3c1.5 0 3 1 3 3"/><line x1="4" y1="4" x2="20" y2="20" stroke-width="2" stroke-linecap="round" opacity="0.6"/>'
	},
	{
		id: 'fruktoseintoleranz',
		label: 'Fruktoseintoleranz',
		// apple with X
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c-1-1-3-1-4 0S6 6 6 9c0 5 3 9 6 12 3-3 6-7 6-12 0-3-1-5-2-6s-3-1-4 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 2c1-1 2-1 2-1"/>'
	},
	{
		id: 'histaminintoleranz',
		label: 'Histaminintoleranz',
		// warning triangle
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>'
	},
	{
		id: 'nussallergie',
		label: 'Nussallergie',
		// nut shape
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3C7.58 3 4 6.58 4 11c0 4 3 7 8 10 5-3 8-6 8-10 0-4.42-3.58-8-8-8z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v5m-2-2.5h4"/>'
	},
	{
		id: 'sojaallergie',
		label: 'Sojaallergie',
		// bean shape
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.5 5.5c2 2 2 6-1 9s-7 3-9 1-2-6 1-9 7-3 9-1z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 10l4 4" opacity="0.5"/>'
	},
	{
		id: 'fischallergie',
		label: 'Fisch-/Meeresfrüchte-Allergie',
		// fish
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12c0 3-4 6-8 6s-6-2-7-3l2-3-2-3c1-1 3-3 7-3s8 3 8 6z"/><circle cx="15" cy="11" r="1" fill="currentColor"/>'
	},
	{
		id: 'eiallergie',
		label: 'Eiallergie',
		// egg
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c-3 0-6 4-6 9a6 6 0 1012 0c0-5-3-9-6-9z"/>'
	},
	{
		id: 'bluthochdruck',
		label: 'Bluthochdruck (salzarm)',
		// heart
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>'
	},
	{
		id: 'gicht',
		label: 'Gicht (purinarm)',
		// foot/bone
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 21h4m-2-3v3m4-10c2-1 4-3 4-6a4 4 0 00-8 0c0 2-.5 3-2 4s-2.5 3-2 5 2 3 4 3"/>'
	},
	{
		id: 'nierenerkrankung',
		label: 'Nierenerkrankung',
		// kidney shape
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 4c-3 0-5 3-5 6 0 4 2 6 4 8s3 3 5 3 3-1 5-3 4-4 4-8c0-3-2-6-5-6-2 0-3 2-4 2S10 4 8 4z"/>'
	},
	{
		id: 'reizdarmsyndrom',
		label: 'Reizdarmsyndrom (FODMAP)',
		// stomach/digestive
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c3 0 5 2 5 5 0 2-1 3-2 4s-2 3-2 5v4m0-14c-3 0-5 2-5 5 0 2 1 3 2 4"/><circle cx="12" cy="20" r="1" fill="currentColor"/>'
	},
	{
		id: 'cholesterin',
		label: 'Hoher Cholesterinspiegel',
		// heart with pulse
		icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 13l2-3 2 4 2-3 2 2"/>'
	},
	{
		id: 'schwangerschaft',
		label: 'Schwangerschaft',
		// person/baby
		icon: '<circle cx="12" cy="5" r="3" stroke-width="2" fill="none"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-4 0-6 3-6 7h12c0-4-2-7-6-7z"/><circle cx="12" cy="14" r="2" stroke-width="1.5" fill="none"/>'
	}
];
