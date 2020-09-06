const soap = require('./soap');

module.exports = async ({ ids }) => {
  const props = ['ID', 'EmailAddress', 'CreatedDate'];
  const Filter = {
    attributes: { 'xsi:type': 'SimpleFilterPart' },
    Property: 'ID',
    SimpleOperator: 'IN',
    Value: ids,
  };
  return soap.retrieve('Subscriber', props, { Filter });
};
