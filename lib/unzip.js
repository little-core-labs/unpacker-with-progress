const { promisify } = require('util')
const fs = require('fs')
const mkdirp = promisify(require('mkdirp'))
const path = require('path')
const yauzl = require('yauzl')
const pump = require('pump')
const byteSpyCtor = require('./byteSpy')
const shouldSkip = require('./skip-test')

module.exports = unzipper
async function unzipper (src, dest, opts) {
  const stats = {
    get entriesProcessed () {
      return this.unpacked + this.skipped
    },
    get percent () {
      return this.loaded / this.total
    },
    unpacked: 0,
    skipped: 0,
    totalEntries: 0,
    total: 0,
    loaded: 0
  }

  // Populate stats
  await new Promise(getEntryStats)
  // Perform unzip and emit stats
  return new Promise(unzip)

  function getEntryStats (resolve, reject) {
    yauzl.open(src, { lazyEntries: true, autoClose: true }, (err, zipfile) => {
      if (err) return reject(err)

      stats.totalEntries = zipfile.entryCount

      zipfile.on('entry', handleEntry)
      zipfile.on('end', resolve)
      zipfile.on('error', reject)

      zipfile.readEntry()

      function handleEntry (entry) {
        if (err) return reject(err)
        stats.total += entry.uncompressedSize
        zipfile.readEntry()
      }
    })
  }

  function unzip (resolve, reject) {
    yauzl.open(src, { lazyEntries: true, autoClose: true }, (err, zipfile) => {
      if (err) return reject(err)

      opts.onprogress({ ...stats })
      zipfile.on('entry', handleEntry)
      zipfile.on('end', handleEnd)
      zipfile.on('error', reject)
      zipfile.readEntry()

      function handleEntry (entry) {
        // Skip dirs.  Handled via files.
        if (entry.fileName.endsWith('/')) {
          stats.skipped++
          opts.onprogress({ ...stats })
          return zipfile.readEntry()
        }

        // Skip already extracated content.
        const filename = path.resolve(dest, entry.fileName)
        const { uncompressedSize } = entry
        fs.stat(filename, handleStat)

        function handleStat (err, stat) {
          if (shouldSkip(opts.resume, err, stat, uncompressedSize)) {
            stats.loaded += entry.uncompressedSize
            stats.skipped++
            opts.onprogress({ ...stats })
            zipfile.readEntry()
          } else {
            zipfile.openReadStream(entry, handleStream)
          }
        }

        function handleStream (err, readStream) {
          if (err) return reject(err)
          mkdirp(path.dirname(filename), err => {
            if (err) return reject(err)
            const writeStream = fs.createWriteStream(filename)
            const spy = byteSpyCtor(written => {
              stats.loaded += written
              opts.onprogress({ ...stats })
            })
            pump(readStream, spy, writeStream, err => {
              if (err) return reject(err)
              // File written, next...
              stats.unpacked++
              opts.onprogress({ ...stats })
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
