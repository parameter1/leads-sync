# Leads Data Sync
Syncs Marketing Cloud events and data models for Leads, using Lambda and SQS

## AWS Flow
- HOW DO WE HANDLE MULTPLE BUs?

- sqs queue for processing events (and upserting related models) `clicks-to-process`
- sqs queue for events that need to be flagged as processed `clicks-processed`

- lamba that runs on an interval to process events
  - load events from data extension
  - pushed events to processing queue

- lamba that triggers off the `clicks-to-process` queue
  - upserts models and click events

- lamba that listens to the `clicks-processed` queue
  - update data extension rows to mark the events as processed

## To dos
- [ ] add queue trigger on time interval
- [x] deploy leads graph and leads manage
- [x] handle final event sync from last event date
- [ ] send test email using new format, and process clicks
- [x] add click log external key and object id env vars
- [x] ensure events will work with current data model
- [x] disable click redirect URLs
- [x] fix email click data (remove sub+send) and change index back
- [x] determine how to handle url acknowledgements
- [x] determine how to handle EmailSendUrl models
- [x] add `lt.ack` to new link tracking
- [x] combine `n` with `$size: guids` in report processing
- [x] add day, send, url, sub unique index (with filter on sub + send) on email-click-events
- [x] add send and sub values to all previous clicks
- [x] update email-click-events unique index to use partial filter exp on job, usr
- [x] update category upsert to use parentId
- [ ] ad request id pagination support to queue events
- [x] update HTML link tracking to use new URL format
- [ ] need to determine how to handle multiple BUs

## Event Modeling
```js
// 9.1 million, so far
// largest `n` is 770
const newEvent = {
  _id: ObjectId(),
  day: ISODate("2020-09-04T00:00:00.000-05:00"),
  job: ObjectId("5f47eddbc46f3dfbd6c7750c"),
  url: ObjectId("5f47e1c107809f52ef34357c"),
  usr: ObjectId("5e73b74e86dc47a32b5c0199"),
  n: 3,
  // correspond to each unique event
  guids: [],
  last: ISODate("2020-09-04T08:35:29.919-05:00"),
};
```
