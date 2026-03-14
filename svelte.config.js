import adapterAuto from '@sveltejs/adapter-auto';
import adapterStatic from '@sveltejs/adapter-static';

const isCapacitor = process.env.CAPACITOR === 'true';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: isCapacitor
			? adapterStatic({ pages: 'build', assets: 'build', fallback: 'index.html' })
			: adapterAuto()
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
