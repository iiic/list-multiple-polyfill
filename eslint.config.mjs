import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import json from '@eslint/json';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

export default defineConfig( [
	globalIgnores( [ 'package-lock.json', 'playwright-report/', 'test-results/' ] ),

	{
		name: 'javascript',
		files: [ '**/*.{js,mjs,cjs}' ],
		plugins: { js, '@stylistic': stylistic },
		extends: [ 'js/recommended' ],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		linterOptions: {
			reportUnusedDisableDirectives: 'error',
		},
		rules: {
			// possible problems and best practices
			'curly': [ 'error', 'all' ],
			'eqeqeq': [ 'error', 'always' ],
			'no-var': 'error',
			'prefer-const': 'error',

			// code style of this project (tabs, spaces inside of parentheses and brackets, …)
			'@stylistic/indent': [ 'error', 'tab' ],
			'@stylistic/linebreak-style': [ 'error', 'unix' ],
			'@stylistic/eol-last': [ 'error', 'always' ],
			'@stylistic/no-trailing-spaces': 'error',
			'@stylistic/no-mixed-spaces-and-tabs': 'error',
			'@stylistic/no-multiple-empty-lines': [ 'error', { max: 1, maxBOF: 0, maxEOF: 0 } ],
			'@stylistic/no-multi-spaces': 'error',
			'@stylistic/space-in-parens': [ 'error', 'always' ],
			'@stylistic/array-bracket-spacing': [ 'error', 'always' ],
			'@stylistic/object-curly-spacing': [ 'error', 'always' ],
			'@stylistic/space-before-function-paren': [ 'error', { anonymous: 'always', named: 'ignore', asyncArrow: 'always' } ],
			'@stylistic/space-before-blocks': [ 'error', 'always' ],
			'@stylistic/space-infix-ops': 'error',
			'@stylistic/space-unary-ops': 'error',
			'@stylistic/keyword-spacing': 'error',
			'@stylistic/key-spacing': 'error',
			'@stylistic/comma-spacing': 'error',
			'@stylistic/comma-style': [ 'error', 'last' ],
			'@stylistic/comma-dangle': [ 'error', 'always-multiline' ],
			'@stylistic/semi': [ 'error', 'always' ],
			'@stylistic/semi-spacing': 'error',
			'@stylistic/quotes': [ 'error', 'single', { avoidEscape: true } ],
			'@stylistic/spaced-comment': [ 'error', 'always', { block: { balanced: true } } ],
			'@stylistic/function-call-spacing': [ 'error', 'never' ],
			'@stylistic/no-whitespace-before-property': 'error',
			'@stylistic/rest-spread-spacing': [ 'error', 'never' ],
			'@stylistic/new-parens': 'error',
			'@stylistic/arrow-spacing': 'error',
		},
	},
	{
		name: 'javascript/browser',
		files: [ 'listMultiplePolyfill.mjs' ],
		languageOptions: {
			globals: globals.browser,
		},
	},
	{
		name: 'javascript/node',
		files: [ '*.config.mjs', 'scripts/**', 'test/**' ],
		languageOptions: {
			globals: globals.node,
		},
	},
	{
		// callbacks passed to page.evaluate() are executed inside of the browser
		name: 'javascript/e2e',
		files: [ 'test/e2e/**' ],
		languageOptions: {
			globals: globals.browser,
		},
	},

	{
		name: 'json',
		files: [ '**/*.json' ],
		ignores: [ 'jsconfig.json' ],
		plugins: { json },
		language: 'json/json',
		extends: [ 'json/recommended' ],
	},
	{
		name: 'jsonc',
		files: [ 'jsconfig.json', '**/*.jsonc' ],
		plugins: { json },
		language: 'json/jsonc',
		languageOptions: {
			allowTrailingCommas: true,
		},
		extends: [ 'json/recommended' ],
	},
] );
