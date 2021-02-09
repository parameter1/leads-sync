const pattern1 = /ack=([a-zA-Z0-9-_]+)/;
const pattern2 = /lt\.ack=([a-zA-Z0-9-_]+)/;
const pattern3 = /lt\.lidack=([a-f0-9]{24})~([a-zA-Z0-9-_]+)/;

/**
 * Extracts the URL acknowledgement short code from a marketing cloud link.
 *
 * Supports:
 * - `ack=r1NKYklEP`
 * - `lt.ack=r1NKYklEP`
 * - `lt.lidack=601d65c194e7cf49c15896cf~r1NKYklEP`
 *
 * @param {string} value
 */
module.exports = (value) => {
  const combinedMatches = pattern3.exec(value);
  if (combinedMatches && combinedMatches[2]) return combinedMatches[2];

  const legacyMatches = pattern1.exec(value);
  if (legacyMatches && legacyMatches[1]) return legacyMatches[1];
  const matches = pattern2.exec(value);
  if (matches && matches[1]) return matches[1];
  return null;
};
