const { get } = require('object-path');
const { MONGO_DB_NAME } = require('../../env');
const attributes = require('../../marketing-cloud/send-attrs');

const { log } = console;
const attributeKeys = Object.keys(attributes);

const mapSendData = (send) => {
  const mapped = {};
  attributeKeys.forEach((theirKey) => {
    const ourKey = attributes[theirKey];
    const value = get(send, theirKey);
    if (value) mapped[ourKey] = value;
  });
  return mapped;
};

module.exports = async ({ deployments, sends, db }) => {
  log('Processing email sends...');
  const now = new Date();
  const sendIds = [];

  // map deployments by internal deploymentId
  // will be added to the email send map
  const deploymentMap = new Map();
  deployments.forEach((dep) => deploymentMap.set(`${dep._id}`, dep));

  const ops = sends.map((send) => {
    const sendId = `${send.ID}`;
    sendIds.push(sendId);

    const emailId = `${get(send, 'Email.ID', '')}`;
    const deployment = deployments.get(emailId);
    if (!deployment) throw new Error(`Unable to find deployment for ID ${emailId}`);
    const filter = {
      'externalSource.namespace': 'FuelSOAP:Send',
      'externalSource.identifier': sendId,
    };
    const $setOnInsert = { ...filter, createdAt: now, __v: 0 };
    const attrs = mapSendData(send);
    const $set = {
      ...attrs,
      isTestSend: /^test send/i.test(send.Subject) || /^\[test\]:/i.test(send.Subject),
      'metrics.bounces': send.HardBounces || 0 + send.SoftBounces || 0 + send.OtherBounces || 0,
      'externalSource.lastRetrievedAt': now,
      'externalSource.createdAt': send.CreatedDate,
      'externalSource.updatedAt': send.ModifiedDate,
      deploymentId: deployment._id,
      rollupMetrics: deployment.rollupMetrics,
      isNewsletter: deployment.isNewsletter,
      ...(attrs.status === 'Sending' && { sentDate: new Date() }),
    };
    return { updateOne: { filter, update: { $setOnInsert, $set }, upsert: true } };
  });

  log(`Found ${ops.length} email sends to upsert`);
  const collection = await db.collection({ dbName: MONGO_DB_NAME, name: 'email-sends' });
  if (ops.length) await collection.bulkWrite(ops);
  const emailSends = await collection.find({
    'externalSource.namespace': 'FuelSOAP:Send',
    'externalSource.identifier': { $in: sendIds },
  }, {
    projection: {
      'externalSource.identifier': 1,
      deploymentId: 1,
      isTestSend: 1,
      sentDate: 1,
      status: 1,
    },
  }).toArray();
  log('Email send processing complete.');
  return emailSends.reduce((map, send) => {
    const deployment = deploymentMap.get(`${send.deploymentId}`);
    if (!deployment) throw new Error(`Unable to load deployment for ID ${send.deploymentId}`);
    map.set(send.externalSource.identifier, { ...send, deployment });
    return map;
  }, new Map());
};
