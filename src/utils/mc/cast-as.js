const createDate = require('./create-date');

/**
 * Casts a Marketing Cloud data value into the proper data type.
 *
 * @param {string} value
 * @param {*} type
 */
module.exports = (value, type) => {
  switch (type) {
    case 'Boolean':
      if (value === 'False' || value === 'false' || value === '0') return false;
      if (value === 'True' || value === 'true') return true;
      return Boolean(value);
    case 'Number':
      return Number(value);
    case 'Int':
      return parseInt(value, 10);
    case 'Date':
      return createDate(value);
    default:
      if (value === 'False' || value === 'false') return false;
      if (value === 'True' || value === 'true') return true;
      return value;
  }
};
