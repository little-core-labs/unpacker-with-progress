const { promisify } = require('util')
const pump = promisify(require('pump'))
const fs = require('fs')
const tar = require('tar-fs')
const gunzip = require('gunzip-maybe')
const tarStream = require('tar-stream')
const path = require('path')
const byteSpyCtor = require('./byteSpy')

module.exports = untar
async function untar (src, dest, opts) {
  const skipMap = {}
  const stats = {
    get entriesProcessed () {
      return this.skipped + this.unpacked
    },
    percent: 0,
    skipped: 0,
    unpacked: 0,
    total: 0,
    totalBytes: 0,
    bytesWritten: 0
  }

  await getEntryStats()
  await untarEntries()

  return stats

  function getEntryStats () {
    const readStream = fs.createReadStream(src)
    const parse = tarStream.extract()

    parse.on('entry', (header, stream, next) => {
      const filename = path.resolve(dest, header.name)
      const { size } = header

      stats.total++
      stats.totalBytes += size

      stream.on('end', next)

      fs.stat(filename, (err, stat) => {
        if (err || !stat || (stat.size < size || !opts.resume)) {
        // These are the streams we will extract
        // so don't add them to the skip map
        } else {
          skipMap[header.fileName] = header.size
        }
        stream.resume() // just auto drain the stream
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

    return pump(readStream, write)

    function mapStream (fileStream, header) {
      stats.unpacked++
      return fileStream.pipe(byteSpyCtor(statWriter))
    }

    function ignore (name, header) {
      console.log(name, header)
      if (skipMap[name] != null) {
        stats.bytesWritten += header.size
        stats.skipped++
        opts.progressCb({ ...stats })
        return true
      } else {
        return false
      }
    }

    function statWriter (written) {
      stats.bytesWritten += written
      opts.progressCb({ ...stats })
    }
  }
}
