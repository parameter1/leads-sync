const extractUrlId = require('../utils/extract-url-id');
const extractAck = require('../utils/extract-ack');
const getRows = require('../marketing-cloud/get-rows');
const batchSend = require('../utils/sqs-batch-send');
const createDate = require('../marketing-cloud/utils/create-date');

const { log } = console;

exports.handler = async (event = {}) => {
  const date = createDate('9/6/2020 7:59:59 PM');
  log({ date: date.toISOString() });
  const response = await getRows({ date });

  const { queryStringParameters = {} } = event;
  const { requestId } = queryStringParameters;
  log({ requestId });

  // @todo handle paging
  const { Results, OverallStatus } = response;

  const messages = Results.map((row) => {
    const { Properties } = row;
    return Properties.Property.reduce((o, { Name: k, Value: v }) => ({ ...o, [k]: v }), {});
  }).reduce((arr, row) => {
    const { LinkContent } = row;
    const urlId = extractUrlId(LinkContent);
    const ack = extractAck(LinkContent);
    // NOTE: all links must have a `urlId` and an `ack` value.
    if (!urlId || !ack) return arr;
    arr.push({
      Id: row.ID,
      MessageBody: JSON.stringify({ urlId, ack, row }),
    });
    return arr;
  }, []);

  // @todo add BU attributes??
  // push events to the processing queue.
  await batchSend({ queueName: 'clicks-to-process', values: messages });

  const results = {
    events: messages.length,
    status: OverallStatus,
  };
  log('DONE', results);
  return { statusCode: 200, body: JSON.stringify(results) };
};
