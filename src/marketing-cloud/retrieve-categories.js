const soap = require('./soap');

const props = ['ID', 'ParentFolder.ID', 'Name'];

module.exports = async ({ ids }) => {
  const Filter = {
    attributes: { 'xsi:type': 'SimpleFilterPart' },
    Property: 'ID',
    SimpleOperator: ids.length > 1 ? 'IN' : 'equals',
    Value: ids,
  };
  return soap.retrieve('DataFolder', props, { Filter });
};
