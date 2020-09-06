const retrieveSends = require('../../marketing-cloud/retrieve-sends');

const { log } = console;

module.exports = async ({ event }) => {
  log('Loading sends from Marketing Cloud...');
  // create a unique set of send ids from the message bodies
  const idSet = event.Records.reduce((set, record) => {
    set.add(record.body);
    return set;
  }, new Set());
  const sendIds = [...idSet];
  log({ sendIds });

  // retrieve sends from mc
  const { Results: sends } = await retrieveSends({ ids: sendIds });

  log({ sendN: sends.length, idN: sendIds.length });
  if (sends.length !== sendIds.length) throw new Error('Send length mismatch.');

  return sends;
};
