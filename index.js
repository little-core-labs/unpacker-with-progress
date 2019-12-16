const path = require('path')
const fs = require('fs').promises
const { promisify } = require('util')
const mkdirp = promisify(require('mkdirp'))
const assert = require('nanoassert')
const untarer = require('./lib/untar')
const unzipper = require('./lib/unzip')

/**
 * Unpack archives with progress and resume
 * @param  {String} src  Path string of the source archive.
 * @param  {String} dest Path string of the destination folder.
 * @param  {?Object} opts Options object
 * @return {Promise.<Object>}      Return stats about the completed packig process.
 */
async function unpack (src, dest, opts) {
  opts = {
    onprogress (stats) { /* noop */ },
    resume: true, // skip files on disk that match entry filesize
    ...opts
  }

  const srcPathObj = path.parse(src)

  assert(['.gz', '.tar', '.zip'].some(ext => srcPathObj.ext === ext), 'src is an archive')

  let srcStat
  try {
    srcStat = await fs.stat(src)
  } catch (e) {
    const statErr = new Error(`Error resolving src: ${e.message}`)
    statErr.statErr = e
    throw statErr
  }
  assert(srcStat.isFile(), 'src is a resolvable file')

  await mkdirp(dest)

  // Unpackers can assume:
  // - Destination exists
  // - Src exists
  // - Src is of the correct type

  if (['.gz', '.tar'].some(ext => ext === srcPathObj.ext)) {
    return untarer(src, dest, opts)
  }

  if (srcPathObj.ext === '.zip') {
    return unzipper(src, dest, opts)
  }

  throw new Error('Something went wrong')
}

module.exports = unpack
