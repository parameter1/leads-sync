const { MONGO_DB_NAME } = require('../../env');

const { log } = console;

const attrMap = {
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

const getEmailDomain = (email) => {
  if (!email) return '';
  const parts = email.split('@');
  return parts[1].trim().toLowerCase();
};

module.exports = async ({ subscribers, db }) => {
  log('Processing identities...');
  const now = new Date();
  const subscriberIds = [];

  const ops = subscribers.map((sub) => {
    const subId = `${sub.ID}`;
    subscriberIds.push(subId);

    let fieldCount = 1; // start at 1 since email address is always set
    const attrs = sub.Attributes.reduce((o, { Name: k, Value: v }) => {
      const ourKey = attrMap[k];
      if (!ourKey) return o;
      const value = v || '';
      if (value) fieldCount += 1;
      return { ...o, [ourKey]: value.trim() };
    }, {});

    const filter = {
      'externalSource.namespace': 'FuelSOAP:Subscriber',
      'externalSource.identifier': `${subId}`,
    };
    const $setOnInsert = {
      ...filter,
      inactive: false,
      inactiveCustomerIds: [],
      inactiveCampaignIds: [],
      inactiveLineItemIds: [],
      createdAt: now,
      __v: 0,
    };
    const emailAddress = sub.EmailAddress.trim().toLowerCase();
    const $set = {
      emailAddress,
      emailDomain: getEmailDomain(emailAddress),
      ...attrs,
      fieldCount,
      'externalSource.createdAt': sub.CreatedDate,
      'externalSource.lastRetrievedAt': now,
      updatedAt: now,
    };
    return { updateOne: { filter, update: { $setOnInsert, $set }, upsert: true } };
  });
  log(`Found ${ops.length} identities to upsert`);
  const collection = await db.collection({ dbName: MONGO_DB_NAME, name: 'identities' });
  if (ops.length) await collection.bulkWrite(ops);
  const identities = await collection.find({
    'externalSource.namespace': 'FuelSOAP:Subscriber',
    'externalSource.identifier': { $in: subscriberIds },
  }, {
    projection: { 'externalSource.identifier': 1 },
  }).toArray();
  log('Identity processing complete.');
  return identities.reduce((map, identity) => {
    map.set(identity.externalSource.identifier, identity);
    return map;
  }, new Map());
};
