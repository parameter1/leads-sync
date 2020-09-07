const { iterateCursor } = require('@parameter1/mongodb/utils');
const factory = require('../mongodb/factory');
const { MONGO_DB_NAME } = require('../env');

const { log } = console;
const db = factory();

const run = async () => {
  log('Appending `send` field to `event-email-clicks`');

  const [sendColl, eventColl] = await Promise.all([
    db.collection({ dbName: MONGO_DB_NAME, name: 'email-sends' }),
    db.collection({ dbName: MONGO_DB_NAME, name: 'event-email-clicks' }),
  ]);

  const cursor = await sendColl.find({}, { projection: { 'externalSource.identifier': 1 } });

  const ops = [];
  log('Building bulk write operations...');
  await iterateCursor(cursor, (send) => {
    const sendId = send.externalSource.identifier;
    const filter = { job: send._id };
    const update = { $set: { send: sendId } };
    ops.push({ updateMany: { filter, update } });
  });
  log('Bulk operations ready. Writing...');

  if (ops.length) {
    const r = await eventColl.bulkWrite(ops);
    log(r);
  }

  log('Write complete.');
  await db.close();
};

run().catch((e) => setImmediate(() => { throw e; }));
