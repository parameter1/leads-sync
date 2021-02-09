const pattern1 = /leads\.limit0\.io\/click\/([a-f0-9]{24})/;
const pattern2 = /lt\.lid=([a-f0-9]{24})/;
const pattern3 = /lt\.lidack=([a-f0-9]{24})~([a-zA-Z0-9-_]+)/;

/**
 * Extracts the internal, URL ID (ExtractedUrl._id) from a marketing cloud link.
 *
 * Supports:
 * - `leads.limit0.io/click/{id}`
 * - `lt.id={id}`
 * - `lt.lidack={id}~{ack}
 * where `{id}` is a 24-digit hex string
 *
 * @param {string} value
 */
module.exports = (value) => {
  const combinedMatches = pattern3.exec(value);
  if (combinedMatches && combinedMatches[1]) return combinedMatches[1];

  const legacyMatches = pattern1.exec(value);
  if (legacyMatches && legacyMatches[1]) return legacyMatches[1];
  const matches = pattern2.exec(value);
  if (matches && matches[1]) return matches[1];
  return null;
};
