'use strict'; /* global describe, it, before, after */
process.env.NODE_ENV='test';
/**
 * Dependencies
 * --------------------------------------------------------------------------*/

var mbUtils  = require('mongoose-bluebird-utils'),
    mongoose = require('mongoose'),
    should   = require('should'),
    sinon    = require('sinon'),
    cron     = require('cron');

var cron_stub = sinon.stub(cron, 'CronJob', function(params) {
  return { start: function() { return params.onTick(); } };
});

var schedule = require('./index');

describe('schedule', function() {
  // connect to a test db
  before(function() {
    mongoose.connect('mongodb://localhost/test');
  });

  // define mock model
  before(function() {
    var MockSchema = new mongoose.Schema({
      name: String
    });

    MockSchema.methods.instanceMethod = function(cb) {
      cb(null, 'Awesome');
    };

    MockSchema.statics.errorWithAnger = function(msg, cb) {
      if(msg === 'anger') cb(new Error('I\'m angry'));
      else cb(null, 'I\'m cool');
    };

    this.Mock = mongoose.model('Mock', MockSchema);
  });

  before(function(done) {
    var _this = this;
    mbUtils.saveP(new this.Mock({ name: 'Something' }))
      .then(function(m) { _this.mock = m; })
      .nodeify(done);
  });
  after(function(done) { mbUtils.removeP(this.mock).nodeify(done); });

  describe('.execute', function() {
    it('completes without an error', function(done) {
      schedule.execute({
        model: 'Mock',
        method: 'update',
        args: [
          { _id: this.mock.id },
          { name: 'Else' }
        ]
      }, done);
    });

    it('executes the specified method with the desired arguments', function(done) {
      mbUtils.findByIdP(this.Mock, this.mock, 'Mock not found')
        .then(function(mock) {
          should.exist(mock.name);
          mock.name.should.equal('Else');
        })
        .nodeify(done);
    });
  });

  describe('.job', function() {
    var req = {
      data: {
        model: 'Mock',
        method: 'errorWithAnger',
        execution_date: new Date(),
        args: [null]
      }
    };

    it('validates the model name', function(done) {
      var org_model = req.data.model;
      req.data.model = 'Asdf';
      schedule.job(req, function(err) {
        should.exist(err);
        err.should.match(/Invalid model/);
        req.data.model = org_model;
        done();
      });
    });

    it('validates the method name', function(done) {
      var org_method = req.data.method;
      req.data.method = 'asdf';
      schedule.job(req, function(err) {
        should.exist(err);
        err.should.match(/Invalid method/);
        req.data.method = org_method;
        done();
      });
    });

    it('schedules a cron job to be executed at `execution_date`', function(done) {
      schedule.job(req, function(err) {
        if(err) return done(err);

        cron_stub.calledOnce.should.be.ok;
        done();
      });
    });

    it('logs return values', function(done) {
      var args;
      req.log = function() { args = Array.prototype.slice.call(arguments); };

      schedule.job(req, function(err) {
        if(err) return done(err);

        should.exist(args);
        args[0].should.eql('Callback values:');
        args[1].should.have.length(1);
        args[1][0].should.eql('I\'m cool');
        done();
      });
    });

    it('logs errors', function(done) {
      var args = [];
      req.log = function() {
        args.push(Array.prototype.slice.call(arguments));
      };
      req.data.args = ['anger'];

      schedule.job(req, function(err) {
        should.exist(err);

        args.should.have.length(2);
        args[0].should.have.length(2);
        args[1].should.have.length(2);

        args[0].should.containEql('Error:');
        args[1][1].should.match(/I\'m angry/);
        args[1].should.containEql('Stack:');
        done();
      });
    });

    it('validates instance methods', function(done) {
      req.data.doc_id = this.mock._id;
      req.data.method = 'errorWithAnger';
      req.data.args = ['msg'];
      schedule.job(req, function(err) {
        should.exist(err);
        err.should.match(/Invalid method name/);
        done();
      });
    });

    it('lets us execute intance methods', function(done) {
      req.data.doc_id = this.mock._id;
      req.data.method = 'instanceMethod';
      req.data.args = [];
      schedule.job(req, function(err) {
        should.not.exist(err);
        delete req.data.doc_id;
        done();
      });
    });
  });
});
