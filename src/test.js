const queueEvents = require('./lambda/queue-events');
const upsertSubscribers = require('./lambda/upsert-subscribers');

const [, , funcName] = process.argv;
const { log } = console;

if (!funcName) throw new Error('A function name must be provided.');

const funcs = {
  'queue-events': {
    func: queueEvents.handler,
    args: [],
  },
  'upsert-subscribers': {
    func: upsertSubscribers.handler,
    args: [
      {
        Records: [
          { body: '2079997' },
          { body: '2079997' },
          { body: '2405238' },
          { body: '6750413' },
          { body: '6750413' },
          { body: '24433210' },
          { body: '71616056' },
        ],
      },
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
