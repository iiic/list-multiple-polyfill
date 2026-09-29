import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { expect, test } from '@playwright/test';

const ORIGIN = 'http://list-multiple-polyfill.test';
const ROOT = new URL( '../../', import.meta.url );

/** @type {Record<string, string>} */
const CONTENT_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.md': 'text/markdown; charset=utf-8',
};

/** @type {string[]} */
let errors = [];

test.beforeEach( async function ( { page } )
{
	errors = [];
	page.on( 'pageerror', function ( error )
	{
		errors.push( error.message );
	} );
	page.on( 'console', function ( message )
	{
		if ( message.type() === 'error' ) {
			errors.push( message.text() );
		}
	} );

	// files of this repository are served like by a static web server (with correct MIME type of .mjs)
	await page.route( `${ ORIGIN }/**`, async function ( route )
	{
		const path = decodeURIComponent( new URL( route.request().url() ).pathname ).slice( 1 );
		const contentType = CONTENT_TYPES[ extname( path ) ];
		if ( !contentType ) {
			return route.fulfill( { status: 404 } );
		}
		return route.fulfill( { contentType, body: await readFile( new URL( path, ROOT ) ) } );
	} );

	await page.goto( `${ ORIGIN }/example-usage.html` );
} );

test.afterEach( function ()
{
	// e.g. browser refuses to run the polyfill when its integrity hash doesn't match
	expect( errors ).toEqual( [] );
} );

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} listId
 * @returns {Promise<string[]>} values of options which are not hidden
 */
function suggestions( page, listId )
{
	return page.locator( `#${ listId } option:not([hidden])` ).evaluateAll( function ( options )
	{
		return options.map( function ( option )
		{
			return /** @type {HTMLOptionElement} */ ( option ).value;
		} );
	} );
}

test( 'suggests options starting with the typed text', async function ( { page } )
{
	await page.locator( 'input[list="texts"]' ).pressSequentially( 'g' );

	expect( await suggestions( page, 'texts' ) ).toEqual( [ 'gold', 'grey' ] );
} );

test( 'suggests options for the last value, prefixed by all previous values', async function ( { page } )
{
	const input = page.locator( 'input[list="texts"]' );

	await input.pressSequentially( 'black, g' );
	expect( await suggestions( page, 'texts' ) ).toEqual( [ 'black, gold', 'black, grey' ] );

	// user picks a suggestion and continues with the next value
	await input.fill( 'black, gold' );
	await input.pressSequentially( ', w' );
	expect( await suggestions( page, 'texts' ) ).toEqual( [ 'black, gold, white' ] );
} );

test( 'suggests all options after a comma', async function ( { page } )
{
	await page.locator( 'input[list="texts"]' ).pressSequentially( 'red,' );

	expect( await suggestions( page, 'texts' ) ).toEqual( [ 'red,black', 'red,gold', 'red,grey', 'red,pink', 'red,turquoise', 'red,red', 'red,white' ] );
} );

test( 'leaves input[type=email] to the browser', async function ( { page } )
{
	await page.locator( 'input[type="email"]' ).pressSequentially( 'first@example.com, s' );

	expect( await suggestions( page, 'emails' ) ).toEqual( [ 'first@example.com', 'second@example.com', 'third@example.com', 'last@example.com' ] );
} );
