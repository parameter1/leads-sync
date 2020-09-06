const queueEvents = require('./lambda/queue-events');
const upsertSubscribers = require('./lambda/upsert-subscribers');
const upsertSends = require('./lambda/upsert-sends');

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
  'upsert-sends': {
    func: upsertSends.handler,
    args: [
      {
        Records: [
          { body: '599224' },
          { body: '507731' },
          { body: '606454' },
          { body: '609009' },
          { body: '609009' },
          { body: '601864' },
          { body: '606440' },
          { body: '543141' },
          { body: '594317' },
          { body: '594317' },
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
