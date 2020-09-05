const queueEvents = require('./lambda/queue-events');

const [, , funcName] = process.argv;
const { log } = console;

if (!funcName) throw new Error('A function name must be provided.');

const funcs = {
  'queue-events': {
    func: queueEvents.handler,
    args: [],
  },
};

const def = funcs[funcName];
if (!def) throw new Error(`No function was found for '${funcName}'`);

const run = async () => {
  log(`Running '${funcName}' function...`);
  await def.func(...def.args);
};

run().catch((e) => setImmediate(() => { throw e; }));
