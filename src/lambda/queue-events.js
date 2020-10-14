const moment = require('moment');
const extractUrlId = require('../utils/extract-url-id');
const extractAck = require('../utils/extract-ack');
const getRows = require('../marketing-cloud/get-rows');
const batchSend = require('../utils/sqs-batch-send');
const lambda = require('../lambda');
const jobsToSkip = require('../marketing-cloud/jobs-to-skip');

const { log } = console;

exports.handler = async (event = {}) => {
  // change this to a time relative to current invoke date
  const date = moment().subtract(12, 'hours').toDate();
  const { requestId } = event;
  const { Results, OverallStatus, RequestID } = await getRows({ date, requestId });

  if (OverallStatus === 'MoreDataAvailable') {
    // invoke the function again.
    log(`Invoking queue-events function for ${RequestID}`);
    await lambda.invoke({
      FunctionName: 'leads-queue-events',
      InvocationType: 'Event',
      Payload: JSON.stringify({ requestId: RequestID }),
    }).promise();
  }

  if (!Results.length) {
    // nothing to process
    log('No events available to process.');
    log('DONE');
    return { statusCode: 200 };
  }

  const messages = Results.reduce((arr, result) => {
    const { Properties } = result;
    const row = Properties.Property.reduce((o, { Name: k, Value: v }) => ({ ...o, [k]: v }), {});

    const { LinkContent, ID, JobID } = row;
    const urlId = extractUrlId(LinkContent);
    const ack = extractAck(LinkContent);
    const message = { Id: ID, MessageBody: JSON.stringify({ urlId, ack, row }) };
    // NOTE: all links must have a `urlId` and an `ack` value.
    // and cannot be in the Skip Jobs map.
    if (!urlId || !ack || jobsToSkip[JobID]) return arr;
    arr.push(message);
    return arr;
  }, []);

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
  return { statusCode: 200, body: JSON.stringify(results) };
};
