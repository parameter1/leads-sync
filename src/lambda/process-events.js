const moment = require('moment-timezone');
const { ObjectId } = require('@parameter1/mongodb');
const factory = require('../mongodb/factory');
const createDate = require('../marketing-cloud/utils/create-date');
const { AWS_EXECUTION_ENV, MONGO_DB_NAME } = require('../env');
const batchSend = require('../utils/sqs-batch-send');

const loadEmails = require('./process-events/load-emails');
const loadSends = require('./process-events/load-sends');
const loadSubscribers = require('./process-events/load-subscribers');

const upsertEmailCategories = require('./process-events/upsert-email-categories');
const upsertEmailDeployments = require('./process-events/upsert-email-deployments');
const upsertEmailSends = require('./process-events/upsert-email-sends');
const upsertEmailSendUrls = require('./process-events/upsert-email-send-urls');
const upsertIdentities = require('./process-events/upsert-identities');

const { log } = console;
const db = factory();

exports.handler = async (event = {}, context) => {
  // see https://docs.atlas.mongodb.com/best-practices-connecting-to-aws-lambda/
  context.callbackWaitsForEmptyEventLoop = false;

  const messages = event.Records.map((record) => JSON.parse(record.body));

  // create unique sets of jobIds, subscriberIds; and ack-to-job map
  const { jobIdSet, subIdSet, ackMap } = messages.reduce((data, message) => {
    const { JobID, SubscriberID } = message.row;
    data.jobIdSet.add(JobID);
    data.subIdSet.add(SubscriberID);
    data.ackMap.set(message.ack, JobID);
    return data;
  }, { jobIdSet: new Set(), subIdSet: new Set(), ackMap: new Map() });

  // load sends and subscribers from marketing cloud
  const [sends, subscribers] = await Promise.all([
    loadSends({ idSet: jobIdSet }),
    loadSubscribers({ idSet: subIdSet }),
  ]);

  // load emails from marketing cloud and upsert identities
  const [emails, identities] = await Promise.all([
    loadEmails({ sends }),
    upsertIdentities({ subscribers, db }),
  ]);

  // upsert email categories
  const categories = await upsertEmailCategories({ emails, db });

  // upsert email deployments with category IDs (and flags)
  const deployments = await upsertEmailDeployments({ categories, emails, db });

  // upsert email sends with deployment IDs (and flags)
  const emailSends = await upsertEmailSends({ deployments, sends, db });

  // upsert email send urls (using acks) [could be in promise.all]
  await upsertEmailSendUrls({ emailSends, ackMap, db });

  // create email-click-event ops
  const ops = messages.map((message) => {
    const { urlId, row } = message;
    const date = createDate(row.EventDate);
    const day = moment.tz(date, 'America/Chicago').startOf('day').toDate();
    const url = ObjectId(urlId);

    const emailSend = emailSends.get(`${row.JobID}`);
    if (!emailSend) throw new Error(`Unable to find email send for event using ${row.JobID}`);
    const identity = identities.get(`${row.SubscriberID}`);
    if (!identity) throw new Error(`Unable to find identitiy for event using ${row.SubscriberID}`);

    const job = emailSend._id;
    const usr = identity._id;

    const filter = {
      day,
      job,
      url,
      usr,
    };
    const $setOnInsert = { ...filter, n: 0, __v: 0 };
    const $addToSet = { guids: row.ID };
    const $max = { last: date };
    const update = { $setOnInsert, $addToSet, $max };
    return { updateOne: { filter, update, upsert: true } };
  });
  const collection = await db.collection({ dbName: MONGO_DB_NAME, name: 'event-email-clicks' });
  log(`Found ${ops.length} click events to upsert`);
  if (ops.length) {
    const r = await collection.bulkWrite(ops);
    log(r);
  }

  // flag events as processed
  await batchSend({
    queueName: 'clicks-processed',
    values: messages,
    builder: (message, i) => ({ Id: `${message.row.ID}__${i}`, MessageBody: JSON.stringify(message) }),
  });

  if (!AWS_EXECUTION_ENV) await db.close();
};
