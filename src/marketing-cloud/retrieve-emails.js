const { get } = require('object-path');
const rest = require('./rest');
const soap = require('./soap');

module.exports = async ({ ids }) => {
  // retrieve from rest first.
  const body = {
    query: {
      property: 'data.email.legacy.legacyId',
      simpleOperator: 'in',
      values: ids,
    },
    fields: ['name', 'views', 'category', 'createdDate', 'modifiedDate'],
    page: {
      pageSize: ids.length,
    },
  };
  const { items } = await rest.request({ endpoint: '/asset/v1/content/assets/query', method: 'POST', body });
  const { emails, found } = items.reduce((agg, item) => {
    const id = get(item, 'legacyData.legacyId');
    agg.found.set(`${id}`, true);
    agg.emails.push({
      ID: id,
      Name: item.name,
      Subject: get(item, 'views.subjectline.content'),
      CategoryID: get(item, 'category.id'),
      CreatedDate: new Date(item.createdDate),
      ModifiedDate: new Date(item.modifiedDate),
    });
    return agg;
  }, { emails: [], found: new Map() });
  if (emails.length === ids.length) return emails;

  // load any missing emails using the soap client.
  const soapIds = ids.filter((id) => !found.get(`${id}`));

  const props = ['ID', 'CreatedDate', 'ModifiedDate', 'Name', 'Folder', 'CategoryID', 'Subject'];
  const Filter = {
    attributes: { 'xsi:type': 'SimpleFilterPart' },
    Property: 'ID',
    SimpleOperator: soapIds.length > 1 ? 'IN' : 'equals',
    Value: soapIds,
  };
  const { Results } = await soap.retrieve('Email', props, { Filter });
  return [...emails, ...Results];
};
