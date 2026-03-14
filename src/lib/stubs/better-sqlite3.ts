// Stub module used in Capacitor builds to prevent better-sqlite3 (Node-only) from being bundled.
// All data access in Capacitor mode goes through the client-side sql.js store.

export default function Database() {
	return new Proxy(
		{},
		{
			get() {
				return () => new Proxy({}, { get: () => () => ({}) });
			}
		}
	);
}
