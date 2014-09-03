mongoose-schedule
=================
[![Build Status](https://travis-ci.org/yamadapc/mongoose-schedule.svg)](https://travis-ci.org/yamadapc/mongoose-schedule)
[![Dependency Status](https://david-dm.org/yamadapc/mongoose-schedule.svg)](https://david-dm.org/yamadapc/mongoose-schedule)
[![devDependency Status](https://david-dm.org/yamadapc/mongoose-schedule/dev-status.svg)](https://david-dm.org/yamadapc/mongoose-schedule#info=devDependencies)
[![Analytics](https://ga-beacon.appspot.com/UA-54450544-1/mongoose-schedule/README)](https://github.com/igrigorik/ga-beacon)
- - -

A Kue Job to schedule a method to be called on some mongoose document or model,
depending on whether a document id is passed.

## `.job`

Schedules a method to be called on some mongoose document or model, depending
on whether a document id is passed at `job.data.doc_id`.

### Example:

```javascript
var job = {
  data: {
    model: 'Something',
    method: 'remove',
    execution_date: new Date(20, 1, 2014),
    args: [{ _id: some_id }, { active: false }]
  }
};

mongooseSchedule.job(job, function() {});
```

This will execute the `remove` method on the `Something` model with the
defined arguments.

### Params:

| Type         | Name                      | Description                                |
|--------------|---------------------------|--------------------------------------------|
| **Object**   | *job*                     | A kue job.                                 |
| **Function** | *done*                    | A callback function.                       |
| **Object**   | *job.data*                | The job's input data.                      |
| **String**   | *job.data.model*          | The model to schedule a static/method on.  |
| **String**   | *job.data.method*         | The name of the method to schedule.        |
| **Date**     | *job.data.execution_date* | When to execute the method.                |
| **String**   | *[job.data.doc_id]*       | The target document's id. If provided, the |
| **Array**    | *[job.data.args]*         | The arguments to pass into the method.     |

## License
Copyright (c) 2014 Pedro Yamada. Licensed under the MIT license.
