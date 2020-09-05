const {
  cleanEnv,
  num,
  str,
} = require('envalid');

module.exports = cleanEnv(process.env, {
  AWS_ACCOUNT_ID: str({ desc: 'The AWS account ID. This is _not_ provided by the lambda runtime' }),
  AWS_REGION: str({ desc: 'The AWS region. This will be provided by the lambda runtime.' }),
  FUEL_API_AUTH_URL: str({ desc: 'The authentication base URI' }),
  FUEL_API_CLIENT_ID: str({ desc: 'The Marketing Cloud API client ID.' }),
  FUEL_API_CLIENT_SECRET: str({ desc: 'The Marketing Cloud API client secret.' }),
  FUEL_API_ACCOUNT_ID: num({ desc: 'Optional account identifier of the target business unit', default: undefined }),
});
