const { promisify } = require('util')
const fs = require('fs')
const fsp = require('fs').promises
const debug = require('debug')('unpacker-with-progress:unzipper')
const unzip = require('unzipper')
const { Writable } = require('streamx')
const pump = promisify(require('pump'))
const mkdirp = promisify(require('mkdirp'))
const path = require('path')

module.exports = unzipper
async function unzipper (src, dest, opts) {
  const srcRs = fs.createReadStream(src)
  const unzipTr = unzip.Parse()
  const destWs = new Writable({ write })

  const stats = {
    get progress () {
      return this.unpacked + this.skipped
    },
    unpacked: 0,
    skipped: 0,
    total: 0 // TODO populate this
  }

  return pump(srcRs, unzipTr, destWs).catch(e => {
    if (!e.message.includes('premature close')) throw e
  })

  async function write (data, cb) {
    try {
      const { uncompressedSize } = data
      const filename = path.resolve(dest, data.path)
      console.log(filename)
      if (data.type === 'Directory') {
        await mkdirp(filename)
        return cb(null)
      }

      await mkdirp(path.dirname(filename))

      // Special stat error handling
      let stat
      let statErr
      try { stat = await fsp.stat(filename) } catch (e) { statErr = e }

      if (statErr || !stat || (stat.size < uncompressedSize)) {
        stats.unpacked++
        opts.progressCb({ ...stats })
        await pump(data, fs.createWriteStream(filename))
        return cb(null)
      } else {
        debug('unzip: skip:', filename)
        stats.skipped++
        opts.progressCb({ ...stats })
        data.autodrain()
        return cb(null)
      }
    } catch (e) {
      return cb(e)
    }
  }
}
