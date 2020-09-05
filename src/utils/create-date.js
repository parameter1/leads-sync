const moment = require('moment');

/**
 * Creates a `Date` object from a Marketing Cloud string date.
 * Always uses a `-06:00` offset, as their system does not respect DST.
 *
 * @param {string} value The date value from Marketing Cloud.
 */
module.exports = (value) => moment(`${value} -06:00`, 'M/D/YYYY h:mm:ss A Z').toDate();
