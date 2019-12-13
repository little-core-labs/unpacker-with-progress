const { promisify } = require('util')
const fs = require('fs')
// const debug = require('debug')('unpacker-with-progress:unzipper')
const { Transform } = require('streamx')
const mkdirp = promisify(require('mkdirp'))
const path = require('path')
const yauzl = require('yauzl')
const pump = require('pump')

module.exports = unzipper
async function unzipper (src, dest, opts) {
  const stats = {
    get entriesProcessed () {
      return this.unpacked + this.skipped
    },
    get percent () {
      return this.bytesWritten / this.totalBytes
    },
    unpacked: 0,
    skipped: 0,
    total: 0,
    totalBytes: 0,
    bytesWritten: 0
  }

  // Populate stats
  await new Promise(getEntryStats)
  // Perform unzip and emit stats
  return new Promise(unzip)

  function getEntryStats (resolve, reject) {
    yauzl.open(src, { lazyEntries: true, autoClose: true }, (err, zipfile) => {
      if (err) return reject(err)

      stats.total = zipfile.entryCount

      zipfile.on('entry', handleEntry)
      zipfile.on('end', handleEnd)
      zipfile.on('error', reject)

      zipfile.readEntry()

      function handleEntry (entry) {
        if (err) return reject(err)
        stats.totalBytes = stats.totalBytes + entry.uncompressedSize
        zipfile.readEntry()
      }

      function handleEnd () {
        return resolve()
      }
    })
  }

  function unzip (resolve, reject) {
    yauzl.open(src, { lazyEntries: true, autoClose: true }, (err, zipfile) => {
      if (err) return reject(err)

      opts.progressCb({ ...stats })
      zipfile.on('entry', handleEntry)
      zipfile.on('end', handleEnd)
      zipfile.on('error', reject)
      zipfile.readEntry()

      function handleEntry (entry) {
        console.log(entry.fileName)
        // Skip dirs.  Handled via files.
        if (entry.fileName.endsWith('/')) {
          stats.skipped++
          opts.progressCb({ ...stats })
          return zipfile.readEntry()
        }

        // Skip already extracated content.
        const filename = path.resolve(dest, entry.fileName)
        const { uncompressedSize } = entry
        fs.stat(filename, handleStat)

        function handleStat (err, stat) {
          if (err || !stat || (stat.size < uncompressedSize)) {
            zipfile.openReadStream(entry, handleStream)
          } else {
            stats.bytesWritten = stats.bytesWritten + entry.uncompressedSize
            stats.skipped++
            opts.progressCb({ ...stats })
            zipfile.readEntry()
          }
        }

        function handleStream (err, readStream) {
          if (err) return reject(err)
          mkdirp(path.dirname(filename), err => {
            if (err) return reject(err)
            const writeStream = fs.createWriteStream(filename)
            const spy = byteSpyCtor(written => {
              stats.bytesWritten = stats.bytesWritten + written
              opts.progressCb({ ...stats })
            })
            pump(readStream, spy, writeStream, err => {
              if (err) return reject(err)
              // File written, next...
              stats.unpacked++
              opts.progressCb({ ...stats })
              zipfile.readEntry()
            })
          })
        }
      }

      function handleEnd () {
        return resolve({ ...stats })
      }
    })
  }
}

function byteSpyCtor (statCb) {
  return new Transform({
    transform (data, cb) {
      statCb(data.byteLength)
      cb(null, data)
    }
  })
}
