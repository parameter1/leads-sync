const { MONGO_DB_NAME } = require('../../env');

const { log } = console;

module.exports = async ({ categories, emails, db }) => {
  log('Processing email deployments...');
  const now = new Date();
  const emailIds = [];

  const ops = emails.map((email) => {
    const emailId = `${email.ID}`;
    emailIds.push(emailId);

    const categoryId = `${email.CategoryID}`;
    const category = categories.get(categoryId);
    if (!category) throw new Error(`Unable to find category for ID ${categoryId}`);
    const filter = {
      'externalSource.namespace': 'FuelSOAP:Email',
      'externalSource.identifier': emailId,
    };
    const $setOnInsert = { ...filter, createdAt: now, __v: 0 };
    const $set = {
      name: email.Name,
      subject: email.Subject,
      'externalSource.lastRetrievedAt': now,
      'externalSource.createdAt': email.CreatedDate,
      'externalSource.updatedAt': email.ModifiedDate,
      rollupMetrics: category.rollupMetrics,
      isNewsletter: category.isNewsletter,
      categoryId: category._id,
      updatedAt: now,
    };
    return { updateOne: { filter, update: { $set, $setOnInsert }, upsert: true } };
  });
  log(`Found ${ops.length} emails to upsert`);
  const collection = await db.collection({ dbName: MONGO_DB_NAME, name: 'email-deployments' });
  if (ops.length) await collection.bulkWrite(ops);
  const deployments = await collection.find({
    'externalSource.namespace': 'FuelSOAP:Email',
    'externalSource.identifier': { $in: emailIds },
  }, {
    projection: {
      'externalSource.identifier': 1,
      isNewsletter: 1,
      rollupMetrics: 1,
      categoryId: 1,
    },
  }).toArray();
  log('Email deployment processing complete.');
  return deployments.reduce((map, dep) => {
    map.set(dep.externalSource.identifier, dep);
    return map;
  }, new Map());
};
