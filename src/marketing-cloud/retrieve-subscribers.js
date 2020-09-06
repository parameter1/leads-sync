const soap = require('./soap');

module.exports = async ({ ids }) => {
  const props = ['ID', 'EmailAddress', 'CreatedDate'];
  const Filter = {
    attributes: { 'xsi:type': 'SimpleFilterPart' },
    Property: 'ID',
    SimpleOperator: ids.length > 1 ? 'IN' : 'equals',
    Value: ids,
  };
  return soap.retrieve('Subscriber', props, { Filter });
};
