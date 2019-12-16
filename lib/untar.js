const { promisify } = require('util')
const pump = promisify(require('pump'))
const fs = require('fs')
const tar = require('tar-fs')
const gunzip = require('gunzip-maybe')
const tarStream = require('tar-stream')
const path = require('path')
const byteSpyCtor = require('./byteSpy')
const shouldSkip = require('./skip-test')

module.exports = untar
async function untar (src, dest, opts) {
  const skip = {} // Used to track files safe to skip
  const stats = {
    get entriesProcessed () {
      return this.skipped + this.unpacked
    },
    get percent () {
      return this.bytesWritten / this.totalBytes
    },
    skipped: 0,
    unpacked: 0,
    totalEntries: 0,
    totalBytes: 0,
    bytesWritten: 0
  }

  await getEntryStats()
  await untarEntries()

  return { ...stats }

  function getEntryStats () {
    const readStream = fs.createReadStream(src)
    const parse = tarStream.extract()

    parse.on('entry', (header, stream, next) => {
      const { size, name } = header
      const filename = path.resolve(dest, name)

      stats.totalEntries++
      stats.totalBytes += size

      stream.on('end', next)

      fs.stat(filename, (err, stat) => {
        if (shouldSkip(opts.resume, err, stat, size)) skip[name] = size

        stream.resume() // auto drain the stream
      })
    })

    return pump(readStream, gunzip(), parse)
  }

  function untarEntries () {
    const readStream = fs.createReadStream(src)
    const write = tar.extract(dest, {
      mapStream,
      ignore,
      readable: true,
      writable: true
    })

    return pump(readStream, gunzip(), write)

    function mapStream (fileStream, header) {
      stats.unpacked++
      return fileStream.pipe(byteSpyCtor(statWriter))
    }

    function ignore (name, header) {
      const { name: headerName } = header
      if (skip[headerName] != null) {
        // Skip
        const { size } = header
        stats.bytesWritten += size
        stats.skipped++
        opts.progressCb({ ...stats })
        return true
      } else {
        // Don't skip
        return false
      }
    }

    function statWriter (written) {
      stats.bytesWritten += written
      opts.progressCb({ ...stats })
    }
  }
}
