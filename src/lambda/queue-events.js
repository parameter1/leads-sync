const factory = require('../mongodb/factory');
const extractUrlId = require('../utils/extract-url-id');
const extractAck = require('../utils/extract-ack');
const getRows = require('../marketing-cloud/get-rows');
const batchSend = require('../utils/sqs-batch-send');
const createDate = require('../marketing-cloud/utils/create-date');
const { AWS_EXECUTION_ENV, MONGO_DB_NAME } = require('../env');
const lambda = require('../lambda');

const { log } = console;
const db = factory();

const jobsToSkip = {
  289294: true, // old job where email was deleted
  603177: true, // promo job sent from DDT @todo determine how to handle both BUs
};

exports.handler = async (event = {}, context = {}) => {
  // see https://docs.atlas.mongodb.com/best-practices-connecting-to-aws-lambda/
  context.callbackWaitsForEmptyEventLoop = false;

  const date = createDate('9/6/2020 11:35:00 AM');
  // @todo this date should be relative to the execution date.
  const { requestId } = event;
  log({ requestId });

  const response = await getRows({ date, requestId });

  const { Results, OverallStatus, RequestID } = response;

  if (OverallStatus === 'MoreDataAvailable') {
    // invoke the function again.
    log(`Invoking queue-events function for ${RequestID}`);
    await lambda.invoke({
      FunctionName: 'leads-queue-events',
      InvocationType: 'Event',
      Payload: JSON.stringify({ requestId: RequestID }),
    }).promise();
    log('Invoke complete.');
  }

  if (!Results.length) {
    // nothing to process
    log('No events available to process.');
    log('DONE');
    return { statusCode: 200 };
  }

  const guids = [];
  const rows = Results.map((row) => {
    const { Properties } = row;
    const r = Properties.Property.reduce((o, { Name: k, Value: v }) => ({ ...o, [k]: v }), {});
    guids.push(r.ID);
    return r;
  });

  // @todo this is a workaround. fix issues with updating click log rows
  const collection = await db.collection({ dbName: MONGO_DB_NAME, name: 'processed-events' });
  const processed = await collection.find({
    guid: { $in: guids },
  }, { projection: { guid: 1 } }).toArray();
  const processedMap = processed.reduce((map, p) => {
    map.set(p.guid, true);
    return map;
  }, new Map());

  const forceMarkMessages = [];
  const messages = rows.reduce((arr, row) => {
    const { LinkContent, ID, JobID } = row;
    // skip if already marked as processed in the db (@todo this is a workaround)
    if (processedMap.get(ID)) return arr;
    const urlId = extractUrlId(LinkContent);
    const ack = extractAck(LinkContent);
    const message = { Id: ID, MessageBody: JSON.stringify({ urlId, ack, row }) };
    // NOTE: all links must have a `urlId` and an `ack` value.
    // and cannot be in the Skip Jobs map.
    if (!urlId || !ack || jobsToSkip[JobID]) {
      // if not, force mark them as processed.
      forceMarkMessages.push(message);
      return arr;
    }
    // console.log(row);
    arr.push(message);
    return arr;
  }, []);

  if (forceMarkMessages.length) {
    log(`Sending ${forceMarkMessages.length} ineligible links to the 'clicks-processed' queue...`);
    await batchSend({ queueName: 'clicks-processed', values: forceMarkMessages });
    log('Send complete.');
  }

  // @todo add BU attributes??
  // push events to the processing queue.
  log(`Sending ${messages.length} events to the 'clicks-to-process' queue...`);
  await batchSend({ queueName: 'clicks-to-process', values: messages });
  log('Send complete.');

  const results = {
    events: messages.length,
    status: OverallStatus,
  };
  log('DONE', results);
  if (!AWS_EXECUTION_ENV) await db.close();
  return { statusCode: 200, body: JSON.stringify(results) };
};
