'use strict';

var async = require('async');
var mongoose = require('mongoose');

var User = mongoose.model('User');

var flowdockListener = require('./listener.js');


/**
 * Start listening on all connection, avoiding the thundering herd problem
 */
module.exports = function openListeners() {
  User.find({}, function(err, users) {
    async.mapLimit(users, 5, function(user, cb) {
      setTimeout(function() {
        flowdockListener(user);
        cb();
      }, Math.floor((Math.random() * 500) + 1));
    }, function(err) {
      if(err) {
        console.error(err);
      }

      console.log("END-INIT", "All listeners set. Server is ready.");
    });
  });
};
