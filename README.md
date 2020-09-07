# Leads Data Sync
Syncs Marketing Cloud events and data models for Leads, using Lambda and SQS

## AWS Flow
- HOW DO WE HANDLE MULTPLE BUs?

- sqs queue for click events from data extension
- sqs queue for send (with deployment and categories) upsert
- sqs queue for subscriber upsert
- sqs queue for events that need to be flagged as processed

- lamba that runs on an interval to process events
  - load events from data extension
  - get unique list of sends and subscribers to process
  - push sends and subscribers to coresponding upsert model queue
  - push event message to click queue
  - if more paginated results, send to another lambda to process next batch
    - or run inline??
  - push event message to "mark-as-processed" queue

- lambas that read from each model queue and upsert
  - send
  - category

- lamba that listens to the "mark-as-processed" queue
  - update data extension rows to mark the processed events

## To dos
- [ ] support parentEntity rel on categories
- [ ] add click log external key and object id env vars
- [ ] ensure events will work with current data model
- [x] disable click redirect URLs
- [ ] fix email click data (remove sub+send) and change index back
- [x] determine how to handle url acknowledgements
- [x] determine how to handle EmailSendUrl models
- [ ] add `lt.ack` to new link tracking
- [ ] combine `n` with `$size: guids` in report processing
- [x] add day, send, url, sub unique index (with filter on sub + send) on email-click-events
- [x] add send and sub values to all previous clicks
- [x] update email-click-events unique index to use partial filter exp on job, usr
- [ ] remove job+usr index once api is updated
- [ ] update category upsert to use parentId?
- [ ] ad request id pagination support to queue events
- [ ] update HTML link tracking to use new URL format
- [ ] need to determine how to handle multiple BUs

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
  send: '607105', // the send external identifier
  sub: '70257389', // the subscriber external identifier
  // correspond to each unique event
  guids: [],
  // use the $max update operator
  last: ISODate("2020-09-04T08:35:29.919-05:00"),
};
```
