const unpack = require('./index')
const tmp = require('p-temporary-directory')

async function work () {
  const [dir, cleanup] = await tmp()
  const progressCb = (...args) => console.log(...args)

  console.log(dir)
  try {
    const results = await Promise.all([
      // unpack('./test/fixtures/gzip-archive.tar.gz', dir, { progressCb }),
      // unpack('./test/fixtures/tar-archive.tar', dir, { progressCb }),
      unpack('./test/fixtures/test-zip.zip', dir, { progressCb })
    ])
    return results
  } finally {
    await cleanup()
  }
}

work().then(results => {
  console.log(results)
  console.log('done')
}).catch(console.error)
