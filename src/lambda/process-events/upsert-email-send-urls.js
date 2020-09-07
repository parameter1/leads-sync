const { MONGO_DB_NAME } = require('../../env');

const { log } = console;

module.exports = async ({ emailSends, ackMap: ackJobMap, db }) => {
  log('Processing email send urls...');

  const shortIds = [];
  ackJobMap.forEach((jobId, ack) => shortIds.push(ack));

  const ackColl = await db.collection({ dbName: MONGO_DB_NAME, name: 'url-acknowledgments' });
  // load acks, but only where not processed
  const acks = await ackColl.find({
    shortId: { $in: shortIds },
    processed: { $ne: true },
  }).toArray();

  const now = new Date();
  const ops = acks.reduce((arr, ack) => {
    const { shortId } = ack;
    const jobId = ackJobMap.get(shortId);
    if (!jobId) throw new Error(`Unable to get jobId for ack ${shortId}`);
    const emailSend = emailSends.get(jobId);
    if (!emailSend) throw new Error(`Unable to get an email send for ${jobId}`);

    ack.urlIds.forEach((urlId) => {
      const filter = { sendId: emailSend._id, urlId };
      const $setOnInsert = {
        ...filter,
        deploymentId: emailSend.deploymentId,
        // @todo category could technically change... move to $set?
        categoryId: emailSend.deployment.categoryId,
        createdAt: now,
        sentDate: emailSend.sentDate,
        isTestSend: emailSend.isTestSend,
        __v: 0,
      };
      arr.push({ updateOne: { filter, update: { $setOnInsert }, upsert: true } });
    });
    return arr;
  }, []);
  log(`Found ${ops.length} email send urls to upsert`);
  const collection = await db.collection({ dbName: MONGO_DB_NAME, name: 'email-send-urls' });
  if (ops.length) await collection.bulkWrite(ops);

  // flag acks as processed
  const shortIdsToUpdate = acks.map((ack) => ack.shortId);
  if (shortIdsToUpdate.length) {
    log(`Flagging ${shortIdsToUpdate.length} acks as processed.`);
    await ackColl.updateMany({ shortId: { $in: shortIdsToUpdate } }, { $set: { processed: true } });
  }
  log('Email send url processing complete.');
};