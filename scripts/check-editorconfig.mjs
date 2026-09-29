/**
 * Checks that files follow the rules from .editorconfig
 * (charset, end_of_line, indent_style, trim_trailing_whitespace, insert_final_newline and max_line_length).
 *
 * Usage: node scripts/check-editorconfig.mjs [file …]
 * Without arguments all files tracked by git (and new files not ignored by .gitignore) are checked.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'editorconfig';

/** Files which are not written by hand, so they aren't checked. */
const IGNORED_FILES = new Set( [
	'LICENSE', // verbatim text of the licence
] );

/** @type {string[]} */
const files = process.argv.length > 2
	? process.argv.slice( 2 )
	: execFileSync( 'git', [ 'ls-files', '--cached', '--others', '--exclude-standard', '-z' ], { encoding: 'utf8' } )
		.split( '\0' )
		.filter( function ( /** @type {string} */ file )
		{
			return file && !IGNORED_FILES.has( file ) && existsSync( file ) && statSync( file ).isFile();
		} );

/** @type {string[]} */
const errors = [];

for ( const file of files ) {
	const bytes = readFileSync( file );
	if ( bytes.includes( 0 ) ) {
		continue; // binary file
	}
	const props = await parse( resolve( file ) );

	/**
	 * @param {number} line
	 * @param {string} message
	 */
	const report = function ( line, message )
	{
		errors.push( `${ file }${ line ? ':' + line : '' }: ${ message }` );
	};

	const hasBom = bytes[ 0 ] === 0xEF && bytes[ 1 ] === 0xBB && bytes[ 2 ] === 0xBF;
	if ( props.charset === 'utf-8' || props.charset === 'utf-8-bom' ) {
		try {
			new TextDecoder( 'utf-8', { fatal: true } ).decode( bytes );
		} catch {
			report( 0, 'file is not valid UTF-8 (charset)' );
		}
		if ( props.charset === 'utf-8' && hasBom ) {
			report( 1, 'file starts with BOM (charset = utf-8)' );
		} else if ( props.charset === 'utf-8-bom' && !hasBom ) {
			report( 1, 'file does not start with BOM (charset = utf-8-bom)' );
		}
	}

	const content = bytes.toString( 'utf8' );
	if ( !content ) {
		continue;
	}

	if ( props.insert_final_newline === true && !content.endsWith( '\n' ) ) {
		report( 0, 'missing newline at the end of file (insert_final_newline)' );
	} else if ( props.insert_final_newline === false && /\r?\n$/.test( content ) ) {
		report( 0, 'unexpected newline at the end of file (insert_final_newline)' );
	}

	const lines = content.split( '\n' );
	if ( content.endsWith( '\n' ) ) {
		lines.pop();
	}

	lines.forEach( function ( /** @type {string} */ rawLine, /** @type {number} */ index )
	{
		const number = index + 1;
		const hasCr = rawLine.endsWith( '\r' );
		const line = hasCr ? rawLine.slice( 0, -1 ) : rawLine;

		if ( props.end_of_line === 'lf' && hasCr ) {
			report( number, 'CRLF line ending, expected LF (end_of_line)' );
		} else if ( props.end_of_line === 'crlf' && !hasCr && ( number < lines.length || content.endsWith( '\n' ) ) ) {
			report( number, 'LF line ending, expected CRLF (end_of_line)' );
		}

		if ( props.trim_trailing_whitespace === true && /[ \t]$/.test( line ) ) {
			report( number, 'trailing whitespace (trim_trailing_whitespace)' );
		}

		const indentation = /^[ \t]*/.exec( line )[ 0 ];
		if ( props.indent_style === 'tab' && indentation.includes( ' ' ) && !/^\t* \*/.test( line ) ) {
			// a single space after tabs is allowed only for continuation lines of block comments: " * …"
			report( number, 'indentation by spaces, expected tabs (indent_style)' );
		} else if ( props.indent_style === 'space' && indentation.includes( '\t' ) ) {
			report( number, 'indentation by tabs, expected spaces (indent_style)' );
		}

		if ( typeof props.max_line_length === 'number' && [ ...line ].length > props.max_line_length ) {
			report( number, `line is longer than ${ props.max_line_length } characters (max_line_length)` );
		}
	} );
}

if ( errors.length ) {
	console.error( errors.join( '\n' ) );
	console.error( `\n✖ ${ errors.length } problem(s) found, see .editorconfig` );
	process.exitCode = 1;
} else {
	console.log( `✔ ${ files.length } files follow .editorconfig` );
}
