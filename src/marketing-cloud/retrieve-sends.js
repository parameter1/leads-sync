const soap = require('./soap');
const attributes = require('./send-attrs');

const props = [].concat(
  ['ID', 'Email.ID', 'CreatedDate', 'ModifiedDate', 'HardBounces', 'SoftBounces', 'OtherBounces'],
  Object.keys(attributes),
);

module.exports = async ({ ids }) => {
  const Filter = {
    attributes: { 'xsi:type': 'SimpleFilterPart' },
    Property: 'ID',
    SimpleOperator: ids.length > 1 ? 'IN' : 'equals',
    Value: ids,
  };
  return soap.retrieve('Send', props, { Filter });
};
