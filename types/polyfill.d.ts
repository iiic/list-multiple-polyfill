// Custom properties which listMultiplePolyfill.mjs stores on DOM elements.
// Used only for type checking (npm run typecheck), this file is not published.

interface HTMLOptionElement {
	/** Original value of the option, before the polyfill prefixed it with already typed values. */
	trustedValue?: string;
}

interface HTMLDataListElement {
	/** Original values of all options of the datalist. */
	allOptionValues?: Set<string>;
}
