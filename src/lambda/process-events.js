const moment = require('moment');
const { ObjectId } = require('@parameter1/mongodb');
const factory = require('../mongodb/factory');
const createDate = require('../marketing-cloud/utils/create-date');
const { AWS_EXECUTION_ENV, MONGO_DB_NAME } = require('../env');
const batchSend = require('../utils/sqs-batch-send');

const { log } = console;
const db = factory();

exports.handler = async (event = {}) => {
  const messages = event.Records.map((record) => JSON.parse(record.body));

  const ops = messages.map((message) => {
    const { urlId, row } = message;
    const date = createDate(row.EventDate);
    const day = moment(date).startOf('day').toDate();
    const send = `${row.JobID}`;
    const sub = `${row.SubscriberID}`;
    const url = ObjectId(urlId);

    const filter = {
      day,
      send,
      url,
      sub,
    };
    const $setOnInsert = { ...filter, n: 0, __v: 0 };
    const $addToSet = { guids: row.ID };
    const $max = { last: date };

    const update = { $setOnInsert, $addToSet, $max };
    return { updateOne: { filter, update, upsert: true } };
  });
  const collection = await db.collection({ dbName: MONGO_DB_NAME, name: 'event-email-clicks' });
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
