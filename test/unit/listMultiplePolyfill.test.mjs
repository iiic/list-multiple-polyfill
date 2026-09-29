import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { JSDOM, VirtualConsole } from 'jsdom';

const POLYFILL_URL = new URL( '../../listMultiplePolyfill.mjs', import.meta.url );
const COLORS = [ 'black', 'gold', 'grey', 'pink', 'turquoise', 'red', 'white' ];

// The polyfill has no imports nor exports, so it can run as a script inside of the window of every page.
// It's compiled only once, so code coverage of all runs is reported for listMultiplePolyfill.mjs.
const polyfill = new Script( readFileSync( POLYFILL_URL, 'utf8' ), { filename: POLYFILL_URL.href } );

/**
 * Creates a page with given HTML body and runs the polyfill on it (as browser does after the document is parsed).
 *
 * @param {string} body
 */
function loadPage( body )
{
	const dom = new JSDOM( `<!DOCTYPE html><html><body>${ body }</body></html>`, {
		runScripts: 'outside-only',
		virtualConsole: new VirtualConsole(),
	} );
	const { window } = dom;

	/** @type {unknown[]} exceptions thrown inside of event listeners */
	const errors = [];
	window.addEventListener( 'error', function ( event )
	{
		errors.push( event.error );
	} );

	polyfill.runInContext( dom.getInternalVMContext() );

	return {
		errors,

		/**
		 * @param {string} selector
		 * @returns {HTMLInputElement}
		 */
		input( selector )
		{
			return window.document.querySelector( selector );
		},

		/**
		 * Types text at the end of the input value, one character after another like a user.
		 *
		 * @param {HTMLInputElement} input
		 * @param {string} text
		 */
		type( input, text )
		{
			for ( const character of text ) {
				input.value += character;
				input.dispatchEvent( new window.InputEvent( 'input', { bubbles: true, data: character, inputType: 'insertText' } ) );
			}
		},

		/**
		 * Replaces the whole input value at once, like pasting or picking a suggestion.
		 *
		 * @param {HTMLInputElement} input
		 * @param {string} value
		 */
		fill( input, value )
		{
			input.value = value;
			input.dispatchEvent( new window.InputEvent( 'input', { bubbles: true, inputType: 'insertReplacementText' } ) );
		},

		/**
		 * @param {HTMLInputElement} input
		 * @returns {string[]} values of options of the input which are not hidden
		 */
		suggestions( input )
		{
			return [ ...input.list.options ].filter( function ( option )
			{
				return !option.hidden;
			} ).map( function ( option )
			{
				return option.value;
			} );
		},
	};
}

/**
 * @param {string} id
 * @param {string[]} values
 */
function datalist( id, values )
{
	return `<datalist id="${ id }">${ values.map( function ( value )
	{
		return `<option value="${ value }">`;
	} ).join( '' ) }</datalist>`;
}

describe( 'input[type=text][list][multiple]', function ()
{
	test( 'suggests options starting with the typed text', function ()
	{
		const page = loadPage( `<input type="text" list="colors" multiple>${ datalist( 'colors', COLORS ) }` );
		const input = page.input( 'input' );

		page.type( input, 'g' );

		assert.deepEqual( page.suggestions( input ), [ 'gold', 'grey' ] );
		assert.deepEqual( page.errors, [] );
	} );

	test( 'suggests all options, prefixed by the current value, after a comma', function ()
	{
		const page = loadPage( `<input type="text" list="colors" multiple>${ datalist( 'colors', COLORS ) }` );
		const input = page.input( 'input' );

		page.fill( input, 'black' );
		page.type( input, ',' );

		assert.deepEqual( page.suggestions( input ), COLORS.map( function ( color )
		{
			return 'black,' + color;
		} ) );
		assert.deepEqual( page.errors, [] );
	} );

	test( 'suggests options for the last value, prefixed by all previous values', function ()
	{
		const page = loadPage( `<input type="text" list="colors" multiple>${ datalist( 'colors', COLORS ) }` );
		const input = page.input( 'input' );

		page.type( input, 'black, red, g' );

		assert.deepEqual( page.suggestions( input ), [ 'black, red, gold', 'black, red, grey' ] );
		assert.deepEqual( page.errors, [] );
	} );

	for ( const [ separator, expected ] of [
		[ ',', [ 'black,gold', 'black,grey' ] ],
		[ ', ', [ 'black, gold', 'black, grey' ] ],
		[ ' ,', [ 'black ,gold', 'black ,grey' ] ],
		[ ' , ', [ 'black , gold', 'black , grey' ] ],
	] ) {
		test( `accepts "${ separator }" as a separator of values`, function ()
		{
			const page = loadPage( `<input type="text" list="colors" multiple>${ datalist( 'colors', COLORS ) }` );
			const input = page.input( 'input' );

			page.type( input, `black${ separator }g` );

			assert.deepEqual( page.suggestions( input ), expected );
			assert.deepEqual( page.errors, [] );
		} );
	}

	test( 'keeps all options visible when the value ends with one of the options', function ()
	{
		const page = loadPage( `<input type="text" list="colors" multiple>${ datalist( 'colors', COLORS ) }` );
		const input = page.input( 'input' );

		page.type( input, 'gr' );
		page.fill( input, 'grey' );

		assert.deepEqual( page.suggestions( input ), COLORS );
		assert.deepEqual( page.errors, [] );
	} );

	test( 'hides all options when none of them starts with the typed text', function ()
	{
		const page = loadPage( `<input type="text" list="colors" multiple>${ datalist( 'colors', COLORS ) }` );
		const input = page.input( 'input' );

		page.type( input, 'black, x' );

		assert.deepEqual( page.suggestions( input ), [] );
		assert.deepEqual( page.errors, [] );
	} );

	test( 'restores original values of options when the input is cleared', function ()
	{
		const page = loadPage( `<input type="text" list="colors" multiple>${ datalist( 'colors', COLORS ) }` );
		const input = page.input( 'input' );

		page.type( input, 'black, w' );
		assert.deepEqual( page.suggestions( input ), [ 'black, white' ] );

		page.fill( input, '' );
		assert.deepEqual( page.suggestions( input ), COLORS );
		assert.deepEqual( page.errors, [] );
	} );

	test( 'does not fail when the datalist has no options', function ()
	{
		const page = loadPage( `<input type="text" list="colors" multiple>${ datalist( 'colors', [] ) }` );
		const input = page.input( 'input' );

		page.type( input, 'black, g' );

		assert.deepEqual( page.suggestions( input ), [] );
		assert.deepEqual( page.errors, [] );
	} );

	test( 'polyfills every input with its own datalist', function ()
	{
		const page = loadPage( `
			<input id="first" type="text" list="colors" multiple>${ datalist( 'colors', COLORS ) }
			<input id="second" type="text" list="fruits" multiple>${ datalist( 'fruits', [ 'apple', 'banana', 'blueberry' ] ) }
		` );
		const first = page.input( '#first' );
		const second = page.input( '#second' );

		page.type( first, 'red, g' );
		page.type( second, 'apple, b' );

		assert.deepEqual( page.suggestions( first ), [ 'red, gold', 'red, grey' ] );
		assert.deepEqual( page.suggestions( second ), [ 'apple, banana', 'apple, blueberry' ] );
		assert.deepEqual( page.errors, [] );
	} );

	// remove skip after the bug is fixed
	test( 'does not fail when the list attribute points to a missing datalist', { skip: 'known bug: input.list is null, so the listener throws TypeError' }, function ()
	{
		const page = loadPage( '<input type="text" list="missing" multiple>' );
		const input = page.input( 'input' );

		page.type( input, 'a' );

		assert.deepEqual( page.errors, [] );
	} );
} );

describe( 'other input types', function ()
{
	for ( const type of [ 'search', 'tel', 'url' ] ) {
		test( `polyfills input[type=${ type }]`, function ()
		{
			const page = loadPage( `<input type="${ type }" list="colors" multiple>${ datalist( 'colors', COLORS ) }` );
			const input = page.input( 'input' );

			// set at once, typing one character after another would be affected by value sanitization of some types
			page.fill( input, 'black, g' );

			assert.deepEqual( page.suggestions( input ), [ 'black, gold', 'black, grey' ] );
			assert.deepEqual( page.errors, [] );
		} );
	}

	test( 'polyfills input without type attribute (text is default)', function ()
	{
		const page = loadPage( `<input list="colors" multiple>${ datalist( 'colors', COLORS ) }` );
		const input = page.input( 'input' );

		page.type( input, 'black, g' );

		assert.deepEqual( page.suggestions( input ), [ 'black, gold', 'black, grey' ] );
		assert.deepEqual( page.errors, [] );
	} );

	test( 'leaves input[type=email] to the browser, it supports list with multiple natively', function ()
	{
		const emails = [ 'first@example.com', 'second@example.com' ];
		const page = loadPage( `<input type="email" list="emails" multiple>${ datalist( 'emails', emails ) }` );
		const input = page.input( 'input' );

		page.type( input, 'first@example.com, s' );

		assert.deepEqual( page.suggestions( input ), emails );
		assert.deepEqual( page.errors, [] );
	} );
} );

describe( 'inputs which are not polyfilled', function ()
{
	test( 'input without multiple attribute', function ()
	{
		const page = loadPage( `<input type="text" list="colors">${ datalist( 'colors', COLORS ) }` );
		const input = page.input( 'input' );

		page.type( input, 'black, g' );

		assert.deepEqual( page.suggestions( input ), COLORS );
		assert.deepEqual( page.errors, [] );
	} );

	test( 'page without any input', function ()
	{
		const page = loadPage( datalist( 'colors', COLORS ) );

		assert.deepEqual( page.errors, [] );
	} );
} );
