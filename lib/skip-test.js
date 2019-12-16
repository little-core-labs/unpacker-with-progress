module.exports = shouldSkip
/**
 * shouldSkip tests if a file can be safely skipped during unpack based on stat results.
 * @param  {Boolean} enableSkip Used to disable skipping from an option.
 * @param  {Error} err The error you might get from the stat action.
 * @param  {Object} stat The Stat object.
 * @param  {Number} targetSize The size in bytes that the file should have when fully unpacked.
 * @return {Boolean} Weather or not it is safe to skip the file.
 */
function shouldSkip (enableSkip, err, stat, targetSize) {
  if (!enableSkip) return false
  if (err) return false
  if (!stat) return false
  if (stat.size < targetSize) return false
  return true
}
