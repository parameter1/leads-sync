const { iterateCursor } = require('@parameter1/mongodb/utils');
const eachOfSeries = require('async/eachOfSeries');
const factory = require('../mongodb/factory');
const { MONGO_DB_NAME } = require('../env');
const chunkArray = require('../utils/chunk-array');

const { log } = console;
const db = factory();

const run = async () => {
  log('Appending `sub` field to `event-email-clicks`');

  const [subColl, eventColl] = await Promise.all([
    db.collection({ dbName: MONGO_DB_NAME, name: 'identities' }),
    db.collection({ dbName: MONGO_DB_NAME, name: 'event-email-clicks' }),
  ]);

  const cursor = await subColl.find({}, { projection: { 'externalSource.identifier': 1 } });

  const ops = [];
  log('Building bulk write operations...');
  await iterateCursor(cursor, (identity) => {
    const sub = identity.externalSource.identifier;
    const filter = { usr: identity._id };
    const update = { $set: { sub } };
    ops.push({ updateMany: { filter, update } });
  });

  const chunks = chunkArray(ops, 250);
  const n = chunks.length;
  log(`Created ${n} chunks of 250 operations each. Writing...`);

  await eachOfSeries(chunks, async (chunk, index) => {
    log(`Writing chunk ${index + 1} of ${n}`);
    if (chunk.length) await eventColl.bulkWrite(chunk);
    log('Chunk write complete.');
  });

  log('Write complete.');
  await db.close();
};

run().catch((e) => setImmediate(() => { throw e; }));
