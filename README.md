# Leads Data Sync
Syncs Marketing Cloud events and data models for Leads, using Lambda and SQS

## AWS Flow
- HOW DO WE HANDLE MULTPLE BUs?

- sqs queue for click events from data extension
- sqs queue for send upsert
- sqs queue for email upsert
- sqs queue for subscriber upsert
- sqs queue for category upsert
- sqs queue for events that need to be flagged as processed

- lamba that runs on an interval to process events
  - load events from data extension
  - get unique list of sends and subscribers to process
  - push sends and subscribers to cooresponding upsert model queue
  - push event message to click queue
  - if more paginated results, send to another lambda to process next batch
    - or run inline??
  - push event message to "mark-as-processed" queue

- lambas that read from each model queue and upsert
  - send
    - should also push a unique set of emails to upsert queue
  - emails
    - should also push a unique set of categories to upsert queue
  - subscriber
  - category

- lamba that listens to the "mark-as-processed" queue
  - update data extension rows to mark the processed events


## To dos
- determine how to handle isNewsletter and rollupMetrics on sends/deployments
- ensure events will work with current data model
- update mc models (sends, etc) to support multiple rels
- update resolvers to support multiple rels
- disable click redirect URLs
- update HTML link tracking to use new URL format
- will need to run a process to update events with internal URLs
- need to determine how to handle URL acknowledgements

- determine if sends are unique per BU
- will need add entity fields to
  - email-sends
  - email-deployments
  - email-categories
  - identities
- add category id to email sends?
- add relationships based on external identifier??
  - for example, on sends:
  ```js
  const send = {
    deployment: {
      _id: 'mc.ien.email*117131',
    },
  }
  ```

```
Current Unique Index. Needs to be verified based on actual queries.
{
  "day" : 1,
  "job" : 1,
  "url" : 1,
  "usr" : 1
}
```

## Core Modeling
```js
const send = {
  _id: ObjectId(),
  deploymentId: ObjectId(),
  deployment: {
    _id: ObjectId(),
    entity: 'mc.ien.email*117131',
  },
};
```

## Event Modeling
```js
// 9.1 million, so far
// largest `n` is 770
const currentEvent = {
  _id: ObjectId(),
  day: ISODate("2020-09-04T00:00:00.000-05:00"),
  job: ObjectId("5f47eddbc46f3dfbd6c7750c"),
  url: ObjectId("5f47e1c107809f52ef34357c"),
  usr: ObjectId("5e73b74e86dc47a32b5c0199"),
  n: 3,
  last: ISODate("2020-09-04T08:35:29.919-05:00"),
};

const newEvent = {
  _id: ObjectId(),
  day: ISODate("2020-09-04T00:00:00.000-05:00"),
  url: ObjectId("5f47e1c107809f52ef34357c"),
  // use the ns+id values (should the BU be included??)
  dep: 'mc.ien.email*117131', // the email deployment external identifier - is this needed?
  job: 'mc.ien.send*607105', // the send external identifier
  usr: 'mc.ien.subscriber*70257389', // the subscriber external identifier
  // correspond to each unique event
  // these are currently set to legacy since we don't have the DE values
  guids: [
    'legacy-1',
    'legacy-2',
    'legacy-3',
  ],
  // use the $max update operator
  last: ISODate("2020-09-04T08:35:29.919-05:00"),
};
```

{
    "_id" : ObjectId("5f52429cc46f3dfbd64d4925"),
    "day" : ISODate("2020-09-04T00:00:00.000-05:00"),
    "job" : ObjectId("5f47eddbc46f3dfbd6c7750c"),
    "url" : ObjectId("5f47e1c107809f52ef34357c"),
    "usr" : ObjectId("5e73b74e86dc47a32b5c0199"),
    "n" : 3,
    "last" : ISODate("2020-09-04T08:35:29.919-05:00"),
    "__v" : 0
}
