const { get } = require('object-path');
const retrieveCategoryTree = require('../../marketing-cloud/retrieve-category-tree');
const { MONGO_DB_NAME } = require('../../env');

const { log } = console;

const cleanCategoryName = (n) => (n === 'my emails' ? 'My Emails' : n);

module.exports = async ({ emails, db }) => {
  log('Processing categories...');
  // get unique set of category IDs from emails
  const categoryIdSet = emails.reduce((set, email) => {
    set.add(`${email.CategoryID}`);
    return set;
  }, new Set());
  const categoryIds = [...categoryIdSet];
  log({ categoryIds });

  // retrieve category tree for each id
  const categoryTrees = await Promise.all(categoryIds.map(async (id) => {
    const tree = await retrieveCategoryTree(id);
    return { id, tree };
  }));
  log({ categoryN: categoryTrees.length, idN: categoryIds.length });
  if (categoryTrees.length !== categoryIds.length) throw new Error('Category length mismatch.');

  // create unique map of category ops
  const opsMap = categoryTrees.reduce((map, { tree }) => {
    const now = new Date();
    tree.forEach((cat, i) => {
      const filter = {
        'externalSource.namespace': 'FuelSOAP:DataFolder',
        'externalSource.identifier': `${cat.ID}`,
      };
      const parents = tree.slice(i).reverse();
      const parentFolderId = get(cat, 'ParentFolder.ID');
      const $setOnInsert = {
        ...filter,
        rollupMetrics: false,
        isNewsletter: false,
        createdAt: now,
        __v: 0,
      };
      const $set = {
        name: cleanCategoryName(cat.Name),
        fullName: parents.map((p) => cleanCategoryName(p.Name)).join(' | '),
        'externalSource.lastRetrievedAt': now,
        hasDeployments: i === 0,
        updatedAt: now,
        ...(parentFolderId && { 'parent.namespace': 'FuelSOAP:DataFolder' }),
        ...(parentFolderId && { 'parent.identifier': `${parentFolderId}` }),
      };
      map.set(`${cat.ID}`, { filter, update: { $setOnInsert, $set }, upsert: true });
    });
    return map;
  }, new Map());

  // bulk upsert categories
  const ops = [];
  opsMap.forEach((updateOne) => {
    ops.push({ updateOne });
  });
  log(`Found ${ops.length} categories to upsert (with parents)`);
  const collection = await db.collection({ dbName: MONGO_DB_NAME, name: 'email-categories' });
  if (ops.length) await collection.bulkWrite(ops);
  const categories = await collection.find({
    'externalSource.namespace': 'FuelSOAP:DataFolder',
    'externalSource.identifier': { $in: categoryIds },
  }, {
    projection: { 'externalSource.identifier': 1, isNewsletter: 1, rollupMetrics: 1 },
  }).toArray();
  log('Category processing complete.');
  return categories.reduce((map, cat) => {
    map.set(cat.externalSource.identifier, cat);
    return map;
  }, new Map());
};
