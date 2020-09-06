const factory = require('../mongodb/factory');
const { AWS_EXECUTION_ENV, MONGO_DB_NAME } = require('../env');
const retrieve = require('../marketing-cloud/retrieve-subscribers');

const { log } = console;
const db = factory();

const createFilter = (id) => ({
  'externalSource.namespace': 'FuelSOAP:Subscriber',
  'externalSource.identifier': `${id}`,
});

const writePlaceholders = async ({ ids }) => {
  const now = new Date();
  const ops = ids.map((id) => {
    const filter = createFilter(id);
    const $setOnInsert = {
      ...filter,
      inactive: false,
      inactiveCustomerIds: [],
      inactiveCampaignIds: [],
      inactiveLineItemIds: [],
      fieldCount: 0,
      domainExcluded: false,
      attributes: {},
      createdAt: now,
      updatedAt: now,
      __v: 0,
    };
    return { updateOne: { filter, update: { $setOnInsert }, upsert: true } };
  });

  const collection = await db.collection({ dbName: MONGO_DB_NAME, name: 'identities' });
  if (ops.length) {
    const r = await collection.bulkWrite(ops);
    log(r);
  }
};

const identityAttrMap = {
  'First Name': 'givenName',
  'Last Name': 'familyName',
  Title: 'title',
  'Company Name': 'companyName',
  Address: 'street',
  City: 'city',
  State: 'region',
  Zip: 'postalCode',
  Country: 'country',
  'Phone Number': 'phoneNumber',
  Industry: 'attributes.Industry',
  'Job Function': 'attributes.Job Function',
  'NAICS Code': 'attributes.NAICS Code',
};

const upsert = async ({ subscribers, ids }) => {
  const now = new Date();
  // @todo, if these don't match, should we log an error?
  log({ subscribers: subscribers.length, ids: ids.length });
  if (subscribers.length !== ids.length) throw new Error('Subscriber and ID count mismtach');

  const ops = subscribers.map((sub) => {
    let fieldCount = 1; // start at 1 since email address is always set
    const attrs = sub.Attributes.reduce((o, { Name: k, Value: v }) => {
      const ourKey = identityAttrMap[k];
      if (!ourKey) return o;
      const value = v || '';
      if (value) fieldCount += 1;
      return { ...o, [ourKey]: value.trim() };
    }, {});
    const filter = createFilter(sub.ID);
    const $set = {
      emailAddress: sub.EmailAddress.trim().toLowerCase(),
      ...attrs,
      fieldCount,
      'externalSource.createdAt': sub.CreatedDate,
      'externalSource.lastRetrievedAt': now,
      updatedAt: now,
    };
    return { updateOne: { filter, update: { $set }, upsert: true } };
  });
  const collection = await db.collection({ dbName: MONGO_DB_NAME, name: 'identities' });
  if (ops.length) {
    const r = await collection.bulkWrite(ops);
    log(r);
  }
};

exports.handler = async (event = {}, context = {}) => {
  // see https://docs.atlas.mongodb.com/best-practices-connecting-to-aws-lambda/
  context.callbackWaitsForEmptyEventLoop = false;

  // create a unique set of subscriber ids from the message bodies
  const idSet = event.Records.reduce((set, record) => {
    set.add(record.body);
    return set;
  }, new Set());
  const subscriberIds = [...idSet];

  // first, upsert a placeholder record.
  await writePlaceholders({ ids: subscriberIds });

  // retrieve subscribers from mc
  const { Results } = await retrieve({ ids: subscriberIds });

  // upsert subscribers with data from mc
  await upsert({ subscribers: Results, ids: subscriberIds });

  if (!AWS_EXECUTION_ENV) await db.close();
};
