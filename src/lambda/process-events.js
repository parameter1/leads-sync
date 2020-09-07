const moment = require('moment');
const { ObjectId } = require('@parameter1/mongodb');
const factory = require('../mongodb/factory');
const createDate = require('../marketing-cloud/utils/create-date');
const { AWS_EXECUTION_ENV, MONGO_DB_NAME } = require('../env');

const { log } = console;
const db = factory();

exports.handler = async (event = {}) => {
  const ops = event.Records.map((record) => {
    const { urlId, row } = record.body;
    const date = createDate(row.EventDate);
    const day = moment(date).startOf('day').toDate();
    const job = `${row.JobID}`;
    const usr = `${row.SubscriberID}`;
    const url = ObjectId(urlId);

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
  if (ops.length) {
    const r = await collection.bulkWrite(ops);
    log(r);
  }
  if (!AWS_EXECUTION_ENV) await db.close();
};
