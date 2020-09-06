const { get } = require('object-path');
const soap = require('./soap');

const retrieve = async (id, props) => {
  const Filter = {
    attributes: { 'xsi:type': 'SimpleFilterPart' },
    Property: 'ID',
    SimpleOperator: 'equals',
    Value: id,
  };
  const { Results } = await soap.retrieve('DataFolder', props, { Filter });
  return Results[0];
};

const retrieveTree = async (id, tree = []) => {
  const props = ['ID', 'ParentFolder.ID', 'Name'];
  const result = await retrieve(id, props);
  tree.push(result);
  const parentFolderID = get(result, 'ParentFolder.ID');
  if (parentFolderID && parentFolderID !== '0') await retrieveTree(parentFolderID, tree);
  return tree.slice();
};

module.exports = retrieveTree;
