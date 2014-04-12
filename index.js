'use strict';
/**
 * Dependencies
 * --------------------------------------------------------------------------*/

var _        = require('lodash'),
    CronJob  = require('cron').CronJob,
    mongoose = require('mongoose');

/**
 * schedule (Kue Job)
 * Schedules a method to be called on some mongoose document or model, depending
 * on whether a document id is passed.
 *
 * data: {
 *   model: String,                    (mandatory)
 *   method: String,                   (mandatory)
 *   execution_date: Date,             (mandatory)
 *
 *   doc_id: mongooose.Types.ObjectId, (optional)
 *   args: Array                       (optional)
 * }
 * --------------------------------------------------------------------------*/

exports.job = function(job, done) {
  var model_names = mongoose.modelNames();

  // validate the model name
  if(!_.contains(model_names, job.data.model)) {
    return done(new Error('Invalid model name'));
  }

  // validate the method name
  var tmp_model = mongoose.model(job.data.model);

  if(job.data.doc_id && !tmp_model.prototype[job.data.method]) {
    return done(new Error('Invalid method name'));
  }
  else if(!tmp_model[job.data.method]) {
    return done(new Error('Invalid method name'));
  }

  // default the args array if it doesn't exist
  job.data.args || (job.data.args = []);

  // create the scheduled cronJob
  var cronJob = new CronJob({
    onTick:   execute.bind(null, job.data, tap.bind(null, job.log, done)),
    cronTime: new Date(job.data.execution_date)
  });
  cronJob.start();
};

var execute = exports.execute = function execute(data, cb) {
  var model  = mongoose.model(data.model),
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

var tap = exports.tap = function tap(logFn, cb /*,.. args*/) {
  var args = _.rest(arguments, 2);

  if(logFn) {
    if(args && args[0]) {
      logFn('Error:', args[0]);
      logFn('Stack:', args[0].stack);
    }
    else {
      logFn('Callback values:', _.rest(args));
    }
  }

  cb.apply(null, args);
};
