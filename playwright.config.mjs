import { defineConfig, devices } from '@playwright/test';

export default defineConfig( {
	testDir: 'test/e2e',
	testMatch: '*.spec.mjs',
	fullyParallel: true,
	forbidOnly: Boolean( process.env.CI ),
	reporter: process.env.CI ? [ [ 'github' ], [ 'list' ], [ 'html', { open: 'never' } ] ] : 'list',
	use: {
		trace: 'retain-on-failure',
	},
	projects: [
		{ name: 'chromium', use: { ...devices[ 'Desktop Chrome' ] } },
		{ name: 'firefox', use: { ...devices[ 'Desktop Firefox' ] } },
		{ name: 'webkit', use: { ...devices[ 'Desktop Safari' ] } },
	],
} );
