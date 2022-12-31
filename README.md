# List Multiple Polyfill
JS module polyfill for HTML input element with attributes list and multiple. This combination normally working only when input is type email, or file. But this polyfill make it works every possible type. Simple, easy to use, **No dependencies**, just vanilla js.

Polyfill is in single javascript module file `listMultiplePolyfill.mjs`. Include it into your site like this:

``` html
	<script type="module" src="/listMultiplePolyfill.mjs" crossorigin="anonymous" integrity="sha256-u92fzHsXIk4Zsj80A29F47qxWHai0EDO4kf6gpCMa/g="></script>
```

That's it! Now you can use input element with multiple list.

All other files like `example-usage.html` are there to help, but they are not needed for polyfill function.

More detail info
---------------

This polyfill is in js module, and modules are in default `defer` (even if you didn't add attribute `defer`), it means loaded asynchronously and executed after the document has been parsed.

You can change this default behaviour by adding attribute `async`, but yout can't make it synchronous.

Possible problems?
-----------------

The mjs extension must have the correct mime type set to text/javascript, if it is too laborious, rename the suffix from .mjs to .js.

Services
--------

Unpkg: https://unpkg.com/list-multiple-polyfill

NPM: https://www.npmjs.com/package/list-multiple-polyfill


# Licence

**CC BY-SA 4.0**

This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License. To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.

-------

more info at https://iiic.dev/list-multiple-polyfill
