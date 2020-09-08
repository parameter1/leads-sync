// eslint-disable-next-line import/no-extraneous-dependencies
const AWS = require('aws-sdk');
const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_EXECUTION_ENV,
} = require('./env');

// if there's a lambda execution env, do not use the local env vars when creating lambda client
module.exports = AWS_EXECUTION_ENV ? new AWS.Lambda({ apiVersion: '2015-03-31' }) : new AWS.Lambda({
  apiVersion: '2015-03-31',
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});
