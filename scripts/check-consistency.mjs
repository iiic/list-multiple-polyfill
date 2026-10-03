/**
 * Checks things which have to be kept in sync by hand:
 * 1) Subresource Integrity hashes (integrity="sha…") of the polyfill in README.md and example-usage.html
 *    must match the current content of listMultiplePolyfill.mjs, otherwise browsers refuse to run the script,
 * 2) @version in the header of the polyfill must match version in package.json (0.3 matches 0.3.0, 0.3.1, …).
 *
 * Usage: node scripts/check-consistency.mjs [--fix]
 * With --fix the integrity hashes are updated in place.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const POLYFILL_FILE = 'listMultiplePolyfill.mjs';
const FILES_WITH_INTEGRITY = [ 'README.md', 'example-usage.html' ];

const fix = process.argv.includes( '--fix' );
const polyfill = readFileSync( POLYFILL_FILE );

/** @type {string[]} */
const errors = [];
let outdatedHashes = false;

for ( const file of FILES_WITH_INTEGRITY ) {
	const content = readFileSync( file, 'utf8' );
	let found = 0;

	const fixedContent = content.replace( /<script\b[^>]*>/g, function ( /** @type {string} */ tag )
	{
		if ( !tag.includes( POLYFILL_FILE ) ) {
			return tag;
		}
		return tag.replace( /\bintegrity="([^"]*)"/, function ( /** @type {string} */ attribute, /** @type {string} */ value )
		{
			found++;
			const hashes = value.trim().split( /\s+/ ).map( function ( /** @type {string} */ hash )
			{
				const [ , algorithm ] = /^(sha256|sha384|sha512)-/.exec( hash ) || [];
				if ( !algorithm ) {
					errors.push( `${ file }: unsupported integrity value "${ hash }"` );
					return hash;
				}
				const expected = `${ algorithm }-${ createHash( algorithm ).update( polyfill ).digest( 'base64' ) }`;
				if ( hash !== expected && !fix ) {
					outdatedHashes = true;
					errors.push( `${ file }: integrity "${ hash }" doesn't match ${ POLYFILL_FILE }, expected "${ expected }"` );
				}
				return expected;
			} );
			return `integrity="${ hashes.join( ' ' ) }"`;
		} );
	} );

	if ( !found ) {
		errors.push( `${ file }: no <script> with ${ POLYFILL_FILE } and integrity attribute found` );
	} else if ( fix && fixedContent !== content ) {
		writeFileSync( file, fixedContent );
		console.log( `✔ ${ file }: integrity updated` );
	}
}

const [ , headerVersion ] = /^\s*\*\s*@version\s+(\S+)/m.exec( polyfill.toString( 'utf8' ) ) || [];
const packageVersion = JSON.parse( readFileSync( 'package.json', 'utf8' ) ).version;
if ( !headerVersion ) {
	errors.push( `${ POLYFILL_FILE }: @version not found in the header comment` );
} else if ( packageVersion !== headerVersion && !packageVersion.startsWith( headerVersion + '.' ) ) {
	errors.push( `${ POLYFILL_FILE }: @version ${ headerVersion } doesn't match version ${ packageVersion } in package.json` );
}

if ( errors.length ) {
	console.error( errors.join( '\n' ) );
	console.error( `\n✖ ${ errors.length } problem(s) found${ outdatedHashes ? ', integrity hashes can be updated by: npm run fix' : '' }` );
	process.exitCode = 1;
} else {
	console.log( '✔ integrity hashes and versions are consistent' );
}
