const { get } = require('object-path');
const factory = require('../mongodb/factory');
const { AWS_EXECUTION_ENV, MONGO_DB_NAME } = require('../env');
const retrieve = require('../marketing-cloud/retrieve-sends');
const attributes = require('../marketing-cloud/send-attrs');
const batchSend = require('../utils/sqs-batch-send');
const idBuilder = require('../utils/id-message-builder');

const attributeKeys = Object.keys(attributes);

const { log } = console;
const db = factory();

const createFilter = (id) => ({
  'externalSource.namespace': 'FuelSOAP:Send',
  'externalSource.identifier': `${id}`,
});

const getCollection = () => db.collection({ dbName: MONGO_DB_NAME, name: 'email-sends' });

const writePlaceholders = async ({ ids }) => {
  const now = new Date();
  const ops = ids.map((id) => {
    const filter = createFilter(id);
    // @todo how should this handle the name and the deploymentID???
    // @todo add ready flag??
    const $setOnInsert = {
      ...filter,
      name: `Send ${id}`,
      isTestSend: false,
      rollupMetrics: false,
      isNewsletter: false,
      metrics: {
        sent: 0,
        delivered: 0,
        uniqueOpens: 0,
        uniqueClicks: 0,
        unsubscribes: 0,
        forwards: 0,
        bounces: 0,
      },
      createdAt: now,
      updatedAt: now,
      __v: 0,
    };
    return { updateOne: { filter, update: { $setOnInsert }, upsert: true } };
  });

  const collection = await getCollection();
  if (ops.length) {
    const r = await collection.bulkWrite(ops);
    log(r);
  }
};

const mapSendData = (send) => {
  const mapped = {};
  attributeKeys.forEach((theirKey) => {
    const ourKey = attributes[theirKey];
    const value = get(send, theirKey);
    if (value) mapped[ourKey] = value;
  });
  return mapped;
};

const upsert = async ({ sends, ids }) => {
  const now = new Date();
  // @todo, if these don't match, should we log an error?
  log({ sends: sends.length, ids: ids.length });
  if (sends.length !== ids.length) throw new Error('Send and ID count mismtach');

  // get unique set of email IDs
  const emailIdSet = sends.reduce((set, send) => {
    set.add(`${get(send, 'Email.ID')}`);
    return set;
  }, new Set());
  const emailIds = [...emailIdSet];

  const depColl = await db.collection({ dbName: MONGO_DB_NAME, name: 'email-deployments' });

  // load deployments and send email ids to queue
  const [deployments] = await Promise.all([
    // load deployments from database (not all may be available yet)
    depColl.find({
      query: emailIds.map((id) => ({ 'externalSource.identifier': id })),
      options: { projection: { externalSource: 1, rollupMetrics: 1 } },
    }).toArray(),
    // send deployments to email-upsert queue
    batchSend({ queueName: 'upsert-emails', values: emailIds, builder: idBuilder }),
  ]);

  // create deployment map by email id
  const deploymentMap = deployments.reduce((map, dep) => {
    const emailId = get(dep, 'externalSource.identifier');
    map.set(emailId, dep);
    return map;
  }, new Map());

  const ops = sends.map((send) => {
    const emailId = get(send, 'Email.ID');
    const deployment = deploymentMap.get(emailId);
    const { Subject } = send;
    const $set = {
      ...mapSendData(send),
      isTestSend: /^test send/i.test(Subject) || /^\[test\]:/i.test(Subject),
      'metrics.bounces': send.HardBounces || 0 + send.SoftBounces || 0 + send.OtherBounces || 0,
      'externalSource.lastRetrievedAt': now,
      'externalSource.createdAt': send.CreatedDate,
      'externalSource.updatedAt': send.ModifiedDate,
      'deployment.namespace': 'FuelSOAP:Email',
      'deployment.identifier': emailId,
      ...(deployment && { rollupMetrics: deployment.rollupMetrics }),
      ...(deployment && { deploymentId: deployment._id }),
    };
    const filter = createFilter(send.ID);
    return { updateOne: { filter, update: { $set }, upsert: true } };
  });

  const collection = await getCollection();
  if (ops.length) {
    const r = await collection.bulkWrite(ops);
    log(r);
  }
};

exports.handler = async (event = {}, context = {}) => {
  // see https://docs.atlas.mongodb.com/best-practices-connecting-to-aws-lambda/
  context.callbackWaitsForEmptyEventLoop = false;

  // create a unique set of send ids from the message bodies
  const idSet = event.Records.reduce((set, record) => {
    set.add(record.body);
    return set;
  }, new Set());
  const sendIds = [...idSet];

  // first, upsert a placeholder record.
  await writePlaceholders({ ids: sendIds });

  // retrieve sends from mc
  const { Results } = await retrieve({ ids: sendIds });

  // upsert sends with data from mc
  await upsert({ sends: Results, ids: sendIds });

  if (!AWS_EXECUTION_ENV) await db.close();
};
