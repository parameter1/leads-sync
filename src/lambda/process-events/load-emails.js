const { get } = require('object-path');
const retrieve = require('../../marketing-cloud/retrieve-emails');

const { log } = console;

module.exports = async ({ sends }) => {
  log('Loading emails from Marketing Cloud...');
  // get unique set of email IDs
  const emailIdSet = sends.reduce((set, send) => {
    set.add(`${get(send, 'Email.ID')}`);
    return set;
  }, new Set());
  const emailIds = [...emailIdSet];
  log({ emailIds });

  // retrieve emails from mc
  const emails = await retrieve({ ids: emailIds });

  log({ emailN: emails.length, idN: emailIds.length });
  if (emails.length !== emailIds.length) throw new Error('Email length mismatch.');

  return emails;
};
