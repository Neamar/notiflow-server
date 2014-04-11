'use strict';

var async = require('async');
var mongoose = require('mongoose');

var User = mongoose.model('User');

module.exports.get = function(req, res, next) {
  var json = {};
  json.status= "ok";

  async.waterfall([
    function getUsersNumber(cb){
      User.distinct('flowdockToken').count().exec(function (err, count) {
        json.users = count;
        cb();
      });
    },
    function sendStatus(cb){
      res.send(json);
      cb();
    }
  ], next);
};