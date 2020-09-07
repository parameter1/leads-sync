const soap = require('./soap');

const CUSTOMER_KEY = 'Click Log';

/**
 *
 * @param {object} params
 * @param {Date} params.date
 */
module.exports = ({ date }) => {
  const props = ['JobID', 'SubscriberID', 'EventDate', 'LinkContent', 'ID', 'IsUnique', 'ListID'];
  const Filter = {
    attributes: { 'xsi:type': 'ComplexFilterPart' },
    LeftOperand: {
      attributes: { 'xsi:type': 'ComplexFilterPart' },
      LeftOperand: {
        attributes: { 'xsi:type': 'SimpleFilterPart' },
        Property: 'EventDate',
        SimpleOperator: 'greaterThan',
        DateValue: date.toISOString(),
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
