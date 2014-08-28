'use strict';
/*!
 * Dependencies
 * --------------------------------------------------------------------------*/

var CronJob  = require('cron').CronJob,
    mongoose = require('mongoose');

function MongooseSchedule(db) {
  this.db = db;
  // Bind functions to avoid compatibility issues:
  this.job = this.job.bind(this);
  this.execute = this.execute.bind(this);
  this.tap = this.tap.bind(this);
}

/**
 * Schedules a method to be called on some mongoose document or model, depending
 * on whether a document id is passed at `job.data.doc_id`.
 *
 * ### Example:
 *
 * ```javascript
 * var job = {
 *   data: {
 *     model: 'Something',
 *     method: 'remove',
 *     execution_date: new Date(20, 1, 2014),
 *     args: [{ _id: some_id }, { active: false }]
 *   }
 * };
 *
 * mongooseSchedule.job(job, function() {});
 * ```
 *
 * This will execute the `remove` method on the `Something` model with the
 * defined arguments.
 *
 * @param {Object}   job A kue job.
 * @param {Function} done A callback function.
 *
 * @param {Object} job.data The job's input data.
 * @param {String} job.data.model The model to schedule a static/method on.
 * @param {String} job.data.method The name of the method to schedule.
 * @param {Date}   job.data.execution_date When to execute the method.
 *
 * @param {String} [job.data.doc_id] The target document's id. If provided, the
 * `method` will be executed on the document instance, rather than as a static
 * on the model.
 * @param {Array}  [job.data.args] The arguments to pass into the method.
 */

MongooseSchedule.prototype.job = function(job, done) {
  var model_names = this.db.modelNames();

  // validate the model name
  if(model_names.indexOf(job.data.model) === -1) {
    return done(new Error('Invalid model name'));
  }

  // validate the method name
  var tmp_model = this.db.model(job.data.model);

  if(job.data.doc_id) {
    if(!tmp_model.prototype[job.data.method]) {
      return done(new Error('Invalid method name'));
    }
  }
  else if(!tmp_model[job.data.method]) {
    return done(new Error('Invalid method name'));
  }

  // default the args array if it doesn't exist
  job.data.args || (job.data.args = []);

  // create the scheduled cronJob
  var cronJob = new CronJob({
    onTick:   this.execute.bind(this, job.data, this.tap.bind(this, job.log, done)),
    cronTime: new Date(job.data.execution_date)
  });
  cronJob.start();
};

MongooseSchedule.prototype.execute = function execute(data, cb) {
  var model  = this.db.model(data.model),
      method = data.method,
      doc_id = data.doc_id,
      args   = data.args.concat(cb); // add the callback to the argument list

  if(!doc_id) {
    model[method].apply(model, args);
  }
  else {
    model.findById(doc_id, function(err, doc) {
      if(err) return cb(err);
      else if(!doc) return cb(new Error('Document not found'));

      doc[method].apply(doc, args);
    });
  }
};

MongooseSchedule.prototype.tap = function tap(logFn, cb /*,.. args*/) {
  var args = Array.prototype.slice.call(arguments, 2);

  if(logFn) {
    if(args && args[0]) {
      logFn('Error:', args[0]);
      logFn('Stack:', args[0].stack);
    }
    else {
      logFn('Callback values:', args.slice(1));
    }
  }

  cb.apply(null, args);
};

// Export the default instance and the class for custom db usage:
exports = module.exports = new MongooseSchedule(mongoose);
exports.MongooseSchedule = MongooseSchedule;
