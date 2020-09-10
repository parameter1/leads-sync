const rest = require('../marketing-cloud/rest');
const factory = require('../mongodb/factory');
const { CLICK_LOG_OBJECT_ID, AWS_EXECUTION_ENV, MONGO_DB_NAME } = require('../env');

const { log } = console;
const db = factory();

exports.handler = async (event = {}, context = {}) => {
  // see https://docs.atlas.mongodb.com/best-practices-connecting-to-aws-lambda/
  context.callbackWaitsForEmptyEventLoop = false;

  log('Marking events as processed...');
  const record = event.Records[0];
  const { row } = JSON.parse(record.body);
  const keys = ['ID', 'JobID', 'SubscriberID', 'EventDate', 'IsUnique', 'ListID'].reduce((o, key) => {
    const value = row[key];
    return { ...o, [key]: value };
  }, {});
  const body = [{ keys, values: { Processed: true } }];

  try {
    await rest.request({ endpoint: `/hub/v1/dataevents/${CLICK_LOG_OBJECT_ID}/rowset`, method: 'POST', body });
    log('DONE');
  } catch (e) {
    // @todo this is a workaround. fix issues with updating click log rows
    if (/code: 10006/i.test(e.message)) {
      log('Manually flagging event as processed...');
      const collection = await db.collection({ dbName: MONGO_DB_NAME, name: 'processed-events' });
      const filter = { guid: row.ID };
      const update = { $setOnInsert: { ...filter, date: new Date() } };
      await collection.updateOne(filter, update, { upsert: true });
      log('DONE');
      if (!AWS_EXECUTION_ENV) await db.close();
    } else {
      throw e;
    }
  }
};
