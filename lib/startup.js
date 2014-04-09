'use strict';

var async = require('async');
var mongoose = require('mongoose');

var User = mongoose.model('User');

var flowdockListener = require('./listener.js');

var openListeners = function() {
  User.find({}, function(err, users) {
    async.mapLimit(users, 5, function(user, cb) {
      setTimeout(function() {
        flowdockListener(user);
        cb();
      }, Math.floor((Math.random() * 70) + 1));
    }, function(err){
      if(err) {
        throw err;
      }
    });
  });
};

module.exports = openListeners;
