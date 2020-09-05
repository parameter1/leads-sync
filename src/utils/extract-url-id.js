const pattern1 = /leads\.limit0\.io\/click\/([a-f0-9]{24})/;
const pattern2 = /lt\.lid=([a-f0-9]{24})/;

/**
 * Extracts the internal, URL ID (ExtractedUrl._id) from a marketing cloud link.
 *
 * Supports:
 * - `leads.limit0.io/click/{id}`
 * - `lt.id={id}`
 * where `{id}` is a 24-digit hex string
 *
 * @param {string} value
 */
module.exports = (value) => {
  const legacyMatches = pattern1.exec(value);
  if (legacyMatches && legacyMatches[1]) return legacyMatches[1];
  const matches = pattern2.exec(value);
  if (matches && matches[1]) return matches[1];
  return null;
};
