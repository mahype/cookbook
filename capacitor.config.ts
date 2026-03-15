import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'app.cokko',
	appName: 'Cokko',
	webDir: 'build',
	// No server config = loads from local webDir (fully offline!)
	// For dev debugging, uncomment:
	// server: { url: 'http://10.0.0.97:5178', cleartext: true },
	ios: {
		scheme: 'Cokko'
	},
	android: {
		// Auto-backup enabled by default (Google Drive)
		allowMixedContent: false
	},
	plugins: {
		SplashScreen: {
			launchAutoHide: true,
			launchShowDuration: 3000,
			fadeOutDuration: 300,
			useDialog: false,
			layoutName: '',
			backgroundColor: '#f97316',
			showSpinner: false,
			androidSpinnerStyle: 'small',
			spinnerColor: '#ffffff'
		}
	}
};

export default config;
