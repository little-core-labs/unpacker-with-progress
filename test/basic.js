const tap = require('tap')
const unpack = require('..')
const path = require('path')
const tmp = require('p-temporary-directory')

const statProps = [
  'entriesProcessed',
  'percent',
  'unpacked',
  'skipped',
  'totalEntries',
  'total',
  'loaded']

tap.test('basic api is exported', async t => {
  t.equal(typeof unpack, 'function', 'Exports the unpacker function')
})

tap.test('unzip a zip file', async t => {
  const [dir, cleanup] = await tmp()
  const zipPath = path.resolve(__dirname, './fixtures/test-zip.zip')

  function progressCbAssert (stats) {
    for (const prop of statProps) {
      if (!(stats[prop] != null)) {
        t.fail(`missing prop ${prop} in stats object`)
      }
    }
  }

  try {
    const stats = await unpack(zipPath, dir, { progressCb: progressCbAssert })

    t.equal(stats.entriesProcessed, stats.totalEntries, 'file entries are processed')
    t.equal(stats.percent, 1, 'percent === 1.0')
    t.equal(stats.total, stats.loaded, 'loaded === total')
    t.equal(stats.unpacked, 3, 'three real files are unpacked')
    t.equal(stats.skipped, 2, 'two of the entries are dirs')
  } finally {
    await cleanup()
  }
})

tap.test('unzip a tar file', async t => {
  const [dir, cleanup] = await tmp()
  const tarPath = path.resolve(__dirname, './fixtures/test-tar.tar.gz')

  function progressCbAssert (stats) {
    for (const prop of statProps) {
      if (!(stats[prop] != null)) {
        t.fail(`missing prop ${prop} in stats object`)
      }
    }
  }

  try {
    const stats = await unpack(tarPath, dir, { progressCb: progressCbAssert })

    t.equal(stats.entriesProcessed, stats.totalEntries, 'file entries are processed')
    t.equal(stats.percent, 1, 'percent === 1.0')
    t.equal(stats.total, stats.loaded, 'loaded === total')
    t.equal(stats.unpacked, 3, 'three real files are unpacked')
    t.equal(stats.skipped, 2, 'two of the entries are dirs')
  } finally {
    await cleanup()
  }
})

tap.test('unzip a zip file, then do it again testing resume feature', async t => {
  const [dir, cleanup] = await tmp()
  const zipPath = path.resolve(__dirname, './fixtures/test-zip.zip')

  function progressCbAssert (stats) {
    for (const prop of statProps) {
      if (!(stats[prop] != null)) {
        t.fail(`missing prop ${prop} in stats object`)
      }
    }
  }

  try {
    const stats = await unpack(zipPath, dir, { progressCb: progressCbAssert })

    t.equal(stats.entriesProcessed, stats.totalEntries, 'file entries are processed')
    t.equal(stats.percent, 1, 'percent === 1.0')
    t.equal(stats.total, stats.loaded, 'loaded === total')
    t.equal(stats.unpacked, 3, 'three real files are unpacked')
    t.equal(stats.skipped, 2, 'two of the entries are dirs')

    const resumeStats = await unpack(zipPath, dir, { progressCb: progressCbAssert })

    t.equal(resumeStats.entriesProcessed, resumeStats.totalEntries, 'file entries are processed')
    t.equal(resumeStats.total, resumeStats.loaded, 'loaded === total')
    t.equal(resumeStats.unpacked, 0, 'nothing is unpacked')
    t.equal(resumeStats.skipped, 5, 'everything is skipped')
  } finally {
    await cleanup()
  }
})

tap.test('unzip a tar file, then do it again testing resume feature', async t => {
  const [dir, cleanup] = await tmp()
  const tarPath = path.resolve(__dirname, './fixtures/test-tar.tar.gz')

  function progressCbAssert (stats) {
    for (const prop of statProps) {
      if (!(stats[prop] != null)) {
        t.fail(`missing prop ${prop} in stats object`)
      }
    }
  }

  try {
    const stats = await unpack(tarPath, dir, { progressCb: progressCbAssert })

    t.equal(stats.entriesProcessed, stats.totalEntries, 'file entries are processed')
    t.equal(stats.percent, 1, 'percent === 1.0')
    t.equal(stats.total, stats.loaded, 'loaded === total')
    t.equal(stats.unpacked, 3, 'three real files are unpacked')
    t.equal(stats.skipped, 2, 'two of the entries are dirs')

    const resumeStats = await unpack(tarPath, dir, { progressCb: progressCbAssert })

    t.equal(resumeStats.entriesProcessed, resumeStats.totalEntries, 'file entries are processed')
    t.equal(resumeStats.total, resumeStats.loaded, 'loaded === total')
    t.equal(resumeStats.unpacked, 0, 'nothing is unpacked')
    t.equal(resumeStats.skipped, 5, 'everything is skipped')
  } finally {
    await cleanup()
  }
})

tap.test('unpacking a file that doesnt exist throws', async t => {
  t.rejects(() => unpack('fjdksahfkjdsal.zip'), 'Error resolving src:')
})
