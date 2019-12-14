const { Transform } = require('streamx')

function byteSpyCtor (statCb) {
  return new Transform({
    transform (data, cb) {
      statCb(data.byteLength)
      cb(null, data)
    }
  })
}

module.exports = byteSpyCtor
