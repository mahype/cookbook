import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import path from 'path';

const isCapacitor = process.env.CAPACITOR === 'true';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		allowedHosts: true
	},
	resolve: {
		alias: isCapacitor
			? { 'better-sqlite3': path.resolve('src/lib/stubs/better-sqlite3.ts') }
			: {}
	}
});
