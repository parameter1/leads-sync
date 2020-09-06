const factory = require('../mongodb/factory');
const { AWS_EXECUTION_ENV, MONGO_DB_NAME } = require('../env');

const { log } = console;
const db = factory();

const SUBSCRIBER_NAMESPACE = 'FuelSOAP:Subscriber';

exports.handler = async (event = {}, context = {}) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const now = new Date();
  const idSet = event.Records.reduce((set, record) => {
    set.add(record.body);
    return set;
  }, new Set());
  const subscriberIds = [...idSet];

  // first, upsert a placeholder record.
  const ops = subscriberIds.map((id) => {
    const filter = {
      'externalSource.namespace': SUBSCRIBER_NAMESPACE,
      'externalSource.identifier': `${id}`,
    };
    const $setOnInsert = {
      ...filter,
      inactive: false,
      inactiveCustomerIds: [],
      inactiveCampaignIds: [],
      fieldCount: 0,
      attributes: {},
      createdAt: now,
      updatedAt: now,
    };
    return { updateOne: { filter, update: { $setOnInsert }, upsert: true } };
  });

  const collection = await db.collection({ dbName: MONGO_DB_NAME, name: 'identities' });
  if (ops.length) {
    const r = await collection.bulkWrite(ops);
    log(r);
  }
  if (!AWS_EXECUTION_ENV) await db.close();
};
