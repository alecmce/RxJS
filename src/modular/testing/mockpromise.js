'use strict';

var Disposable = require('../disposable');
var ReactiveTest = require('./reactivetest');
var Subscription = require('./subscription');
var create = require('../observer/create');

function MockPromise(scheduler, messages) {
  var self = this;
  this.scheduler = scheduler;
  this.messages = messages;
  this.subscriptions = [];
  this.observers = [];
  for (var i = 0, len = this.messages.length; i < len; i++) {
    var message = this.messages[i],
        notification = message.value;
    (function (innerNotification) {
      scheduler.scheduleAbsolute(null, message.time, function () {
        var obs = self.observers.slice(0);

        for (var j = 0, jLen = obs.length; j < jLen; j++) {
          innerNotification.accept(obs[j]);
        }
        return Disposable.empty;
      });
    })(notification);
  }
}

MockPromise.prototype.then = function (onResolved, onRejected) {
  var self = this;

  this.subscriptions.push(new Subscription(this.scheduler.clock));
  var index = this.subscriptions.length - 1;

  var newPromise;

  var observer = create(
    function (x) {
      var retValue = onResolved(x);
      if (retValue && typeof retValue.then === 'function') {
        newPromise = retValue;
      } else {
        var ticks = self.scheduler.clock;
        newPromise = new MockPromise(self.scheduler, [ReactiveTest.onNext(ticks, undefined), ReactiveTest.onCompleted(ticks)]);
      }
      var idx = self.observers.indexOf(observer);
      self.observers.splice(idx, 1);
      self.subscriptions[index] = new Subscription(self.subscriptions[index].subscribe, self.scheduler.clock);
    },
    function (err) {
      onRejected(err);
      var idx = self.observers.indexOf(observer);
      self.observers.splice(idx, 1);
      self.subscriptions[index] = new Subscription(self.subscriptions[index].subscribe, self.scheduler.clock);
    }
  );
  this.observers.push(observer);

  return newPromise || new MockPromise(this.scheduler, this.messages);
};

module.exports = MockPromise;
