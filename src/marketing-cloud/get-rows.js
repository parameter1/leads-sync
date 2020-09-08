const soap = require('./soap');
const { CLICK_LOG_CUSTOMER_KEY } = require('../env');

const { log } = console;

/**
 *
 * @param {object} params
 * @param {Date} params.date
 */
module.exports = ({ date, requestId }) => {
  if (requestId) {
    log(`Continuing request ${requestId}...`);
    return soap.continueRetrieve(requestId);
  }

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
  return soap.retrieve(`DataExtensionObject[${CLICK_LOG_CUSTOMER_KEY}]`, props, { Filter });
};
