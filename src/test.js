const queueEvents = require('./lambda/queue-events');
const processEvents = require('./lambda/process-events');
const markAsProcessed = require('./lambda/mark-as-processed');

const sampleEvents = require('../sample-events');

const [, , funcName] = process.argv;
const { log } = console;

if (!funcName) throw new Error('A function name must be provided.');

const funcs = {
  'queue-events': {
    func: queueEvents.handler,
    args: [],
  },
  'process-events': {
    func: processEvents.handler,
    args: [
      { Records: sampleEvents.map((event) => ({ body: event.MessageBody })) },
    ],
  },
  'mark-as-processed': {
    func: markAsProcessed.handler,
    args: [
      { Records: sampleEvents.map((event) => ({ body: event.MessageBody })) },
    ],
  },
};

const def = funcs[funcName];
if (!def) throw new Error(`No function was found for '${funcName}'`);

const run = async () => {
  log(`Running '${funcName}' function...`);
  await def.func(...def.args);
};

run().catch((e) => setImmediate(() => { throw e; }));
