# First Mention

First Mention is a browser extension and bookmarklet that quickly shows you the sentence in which a name first appeared in the article you’re reading.

See the [website](https://danstillman.com/firstmention/) for more info and installation instructions.

## Development

To build from source:

1. `git clone --recursive https://github.com/dstillman/first-mention`
1. `cd first-mention`
1. `npm install`
1. `./build -p b -d`

This will produce debug builds for Chrome and Firefox in `dist/`. Run `./build` for other options.

If you have grunt installed, you can run `grunt watch` to automatically rebuild the extension (and, on macOS, reload it in Chrome) when you change a file.

## Tests

`npm test`

## Acknowledgements

* [Tooltip](https://github.com/darsain/tooltip)
* [XRegExp](http://xregexp.com/)

## License

First Mention is released under the GPLv3. Pull requests welcome!
