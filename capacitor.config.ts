import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'de.cookbook.app',
	appName: 'Cookbook',
	webDir: 'build',
	server: {
		// In dev mode, load from dev server instead of local files
		...(process.env.CAPACITOR_DEV === 'true' ? {
			url: 'http://localhost:5178',
			cleartext: true
		} : {})
	},
	ios: {
		scheme: 'Cookbook'
	},
	android: {
		// Auto-backup enabled by default (Google Drive)
		allowMixedContent: false
	},
	plugins: {
		SplashScreen: {
			launchAutoHide: true,
			backgroundColor: '#ffffff',
			showSpinner: false,
			androidSpinnerStyle: 'small',
			spinnerColor: '#f97316'
		}
	}
};

export default config;
