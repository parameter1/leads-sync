const pattern1 = /ack=([a-zA-Z0-9-_]+)/;
const pattern2 = /lt\.ack=([a-zA-Z0-9-_]+)/;

/**
 * Extracts the URL acknowledgement short code from a marketing cloud link.
 *
 * Supports:
 * - `ack=r1NKYklEP`
 * - `lt.ack=r1NKYklEP`
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
