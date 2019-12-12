const { promisify } = require('util')
const pump = promisify(require('pump'))
const fs = require('fs').promises
const tar = require('tar-fs')
const gunzip = require('gunzip-maybe')

module.exports = untarer
async function untarer (src, dest, opts) {
  const preStat = {} // TODO: populate this prior to pipeline

  const stats = {
    progress: 0,
    skipped: 0,
    get unpacked () {
      return this.progress - this.skipped
    },
    total: 0 // TODO: populate this
  }

  const pipeline = [
    fs.createReadStream(src),
    gunzip(),
    tar.extract(dest, { map, ignore })
  ]

  return pump(...pipeline)

  function map (header) {
    stats.progress++
    opts.progressCb({ ...stats })
    return header
  }
  function ignore (name) {
    if (preStat[name]) {
      stats.skipped++
      opts.progressCb({ ...stats })
      return true
    } else {
      return false
    }
  }
}
