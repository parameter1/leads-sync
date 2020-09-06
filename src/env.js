const {
  cleanEnv,
  num,
  str,
} = require('envalid');

module.exports = cleanEnv(process.env, {
  AWS_ACCOUNT_ID: str({ desc: 'The AWS account ID. This is _not_ provided by the lambda runtime' }),

  // when executing in lambda, these values will be provided at runtime
  AWS_REGION: str({ desc: 'The AWS region. This will be provided by the lambda runtime.' }),
  AWS_ACCESS_KEY_ID: str({ desc: 'This will be provided by the lambda runtime.' }),
  AWS_SECRET_ACCESS_KEY: str({ desc: 'This will be provided by the lambda runtime.' }),
  AWS_EXECUTION_ENV: str({ desc: 'This will be provided by the lambda runtime.', default: undefined }),

  FUEL_API_AUTH_URL: str({ desc: 'The authentication base URI' }),
  FUEL_API_CLIENT_ID: str({ desc: 'The Marketing Cloud API client ID.' }),
  FUEL_API_CLIENT_SECRET: str({ desc: 'The Marketing Cloud API client secret.' }),
  FUEL_API_ACCOUNT_ID: num({ desc: 'Optional account identifier of the target business unit', default: undefined }),
  MONGO_DB_NAME: str({ desc: 'The MongoDB database to write data to.', default: 'leads-sync' }),
  MONGO_DSN: str({ desc: 'The MongoDB DSN to connect to.' }),
});
