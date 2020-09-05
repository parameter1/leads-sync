const extractUrlId = require('../utils/extract-url-id');
const getRows = require('../marketing-cloud/get-rows');
const batchSend = require('../utils/sqs-batch-send');
const createDate = require('../marketing-cloud/utils/create-date');

const { log } = console;

const run = async () => {
  const date = createDate('9/4/2020 11:59:59 PM');
  log(date.toISOString());
  const response = await getRows({ date });

  // @todo handle paging
  const { Results, OverallStatus } = response;

  const { sendIds, subscriberIds, messages } = Results.map((row) => {
    const { Properties } = row;
    return Properties.Property.reduce((o, { Name: k, Value: v }) => ({ ...o, [k]: v }), {});
  }).reduce((data, row) => {
    const { JobID, SubscriberID, LinkContent } = row;
    const urlId = extractUrlId(LinkContent);
    if (!urlId) return data;
    if (JobID) data.sendIds.add(JobID);
    if (SubscriberID) data.subscriberIds.add(SubscriberID);
    data.messages.push({
      Id: row.ID,
      MessageBody: JSON.stringify({
        id: row.ID,
        urlId,
        sendId: row.JobID,
        subscriberId: row.SubscriberID,
        date: row.EventDate, // @todo convert this here??
      }),
    });
    return data;
  }, { sendIds: new Set(), subscriberIds: new Set(), messages: [] });

  // @todo add BU attributes??
  const idBuilder = (id) => ({ Id: id, MessageBody: id });
  await Promise.all([
    batchSend({ queueName: 'upsert-sends', values: [...sendIds], builder: idBuilder }),
    batchSend({ queueName: 'upsert-subscribers', values: [...subscriberIds], builder: idBuilder }),
    // batchSend({ queueName: 'clicks-to-process', values: messages }),
  ]);

  log('DONE', {
    sends: sendIds.size,
    subscribers: subscriberIds.size,
    events: messages.length,
    status: OverallStatus,
  });
};

run().catch((e) => setImmediate(() => { throw e; }));