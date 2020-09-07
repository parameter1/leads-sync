const rest = require('../marketing-cloud/rest');
const { CLICK_LOG_OBJECT_ID } = require('../env');

const { log } = console;

exports.handler = async (event = {}) => {
  const body = event.Records.map((record) => {
    const { row } = JSON.parse(record.body);
    const keys = ['ID', 'JobID', 'SubscriberID', 'EventDate', 'IsUnique', 'ListID'].reduce((o, key) => {
      const value = row[key];
      return { ...o, [key]: value };
    }, {});
    return { keys, values: { Processed: true } };
  });
  const updated = await rest.request({ endpoint: `/hub/v1/dataevents/${CLICK_LOG_OBJECT_ID}/rowset`, method: 'POST', body });
  log(updated);
};
