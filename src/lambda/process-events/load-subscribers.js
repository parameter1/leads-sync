const retrieve = require('../../marketing-cloud/retrieve-subscribers');

const { log } = console;

module.exports = async ({ idSet }) => {
  log('Loading subscribers from Marketing Cloud...');
  const subscriberIds = [...idSet];
  log({ subscriberIds });

  // retrieve subscribers from mc
  const { Results: subscribers } = await retrieve({ ids: subscriberIds });

  log({ subscriberN: subscribers.length, idN: subscriberIds.length });
  if (subscribers.length !== subscriberIds.length) throw new Error('Subscriber length mismatch.');

  return subscribers;
};
