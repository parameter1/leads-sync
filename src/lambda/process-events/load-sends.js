const retrieveSends = require('../../marketing-cloud/retrieve-sends');

const { log } = console;

module.exports = async ({ idSet }) => {
  log('Loading sends from Marketing Cloud...');
  const sendIds = [...idSet];
  log({ sendIds });

  // retrieve sends from mc
  const { Results: sends } = await retrieveSends({ ids: sendIds });

  log({ sendN: sends.length, idN: sendIds.length });
  if (sends.length !== sendIds.length) throw new Error('Send length mismatch.');

  return sends;
};
