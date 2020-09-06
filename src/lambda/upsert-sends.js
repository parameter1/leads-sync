const factory = require('../mongodb/factory');
const { AWS_EXECUTION_ENV } = require('../env');

const loadSends = require('./upsert-sends/load-sends');
const loadEmails = require('./upsert-sends/load-emails');
const upsertCategories = require('./upsert-sends/categories');
const upsertDeployments = require('./upsert-sends/upsert-deployments');
const upsertEmailSends = require('./upsert-sends/upsert-email-sends');

const db = factory();

exports.handler = async (event = {}, context = {}) => {
  // see https://docs.atlas.mongodb.com/best-practices-connecting-to-aws-lambda/
  context.callbackWaitsForEmptyEventLoop = false;

  // load sends from marketing cloud
  const sends = await loadSends({ event });
  // load emails from marketing cloud
  const emails = await loadEmails({ sends });
  // upsert email categories
  const categories = await upsertCategories({ emails, db });
  // upsert emails with category IDs (and flags)
  const deployments = await upsertDeployments({ categories, emails, db });
  // then upsert sends with deployment IDs (and flags)
  await upsertEmailSends({ deployments, sends, db });

  if (!AWS_EXECUTION_ENV) await db.close();
};
