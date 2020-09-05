const soap = require('./soap');
const createDate = require('./utils/create-date');

const CUSTOMER_KEY = 'Click Log';

module.exports = () => {
  const props = ['JobID', 'SubscriberID', 'EventDate', 'LinkContent', 'ID'];
  const Filter = {
    attributes: { 'xsi:type': 'ComplexFilterPart' },
    LeftOperand: {
      attributes: { 'xsi:type': 'ComplexFilterPart' },
      LeftOperand: {
        attributes: { 'xsi:type': 'SimpleFilterPart' },
        Property: 'EventDate',
        SimpleOperator: 'greaterThan',
        DateValue: createDate('7/31/2020 11:59:59 PM').toISOString(),
      },
      LogicalOperator: 'AND',
      RightOperand: {
        attributes: { 'xsi:type': 'SimpleFilterPart' },
        Property: 'isBot_v3',
        SimpleOperator: 'equals',
        Value: false,
      },
    },
    LogicalOperator: 'AND',
    RightOperand: {
      attributes: { 'xsi:type': 'ComplexFilterPart' },
      LeftOperand: {
        attributes: { 'xsi:type': 'SimpleFilterPart' },
        Property: 'Ready',
        SimpleOperator: 'equals',
        Value: true,
      },
      LogicalOperator: 'AND',
      RightOperand: {
        attributes: { 'xsi:type': 'SimpleFilterPart' },
        Property: 'Processed',
        SimpleOperator: 'equals',
        Value: false,
      },
    },
  };
  return soap.retrieve(`DataExtensionObject[${CUSTOMER_KEY}]`, props, { Filter });
};
