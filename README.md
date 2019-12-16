# unpacker-with-progress
[![Actions Status](https://github.com/little-core-labs/unpacker-with-progress/workflows/Tests/badge.svg)](https://github.com/little-core-labs/unpacker-with-progress/actions)

Unpack `.tar`, `.tar.gz` and `.zip` archives, provide progress info, and an idempotent + resumable API.

## Usage

```js
const unpacker = require('unpacker-with-progress')
const zip = './some-zip.zip'
const tar = './some-zip.tar.gz'
const dest = './some-dest'

function unpack () {
  return Promise.all([
    unpacker(zip, dest, { onprogress (progress) { console.log(progress.percent) } }),
    unpacker(tar, dest, { onprogress (progress) { console.log(progress.percent) } })
  ])
}

unpack().then(console.log('done'))
```

## Installation

```console
$ npm install unpacker-with-progress -g
```

## API

### `promise(stats) = unpacker(src, dest, [opts])`

Unpack a `zip` or `tar.gz` at the given `src` path, to the `dest` path.  Returns a promise that resolves to a `stats` object.

Opts include:

```js
{
  resume: true, // Skip files if they are already extracted in dest
  onprogress (stats) { /* noop */ } // progress function.  Use this to track progress while extraacting.
}
```

The `stats` object contains the following properties:

```js
{
  entriesProcessed, // running total of entries processed
  percent, // percentage of extraction complete 0.0 - 1.0
  skipped, // number of entries skipped
  unpacked, // number of files extracted
  totalEntries, // Total number of entries
  total, // total number of bytes after extraction
  loaded // running total of bytes written
}
```

## See also

This module implements the desired interface over the following modules:

- [tar-fs](https://github.com/mafintosh/tar-fs)
- [yauzl](https://github.com/thejoshwolfe/yauzl)

## Liscense

MIT
