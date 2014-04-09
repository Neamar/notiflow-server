'use strict';

var restify = require('restify');
var request = require('supertest');
var async = require('async');
var mongoose = require('mongoose');

var User = mongoose.model('User');

module.exports.post = function(req, res, next) {
  if(!req.params.gcm_token || !req.params.flowdock_token) {
    return next(new restify.InvalidArgumentError("You must specifiy both gcm_token and flowdock_token."));
  }

  var flowdockUrl = "https://" + req.params.flowdock_token + "@api.flowdock.com";

  var names;
  async.waterfall([
    function getFlowsNames(cb) {
      request(flowdockUrl)
        .get('/flows')
        .expect(200)
        .end(cb);
    },
    function generateResponse(err, res, cb) {
      if(err) {
        return cb(new Error("Error when getting flows names"));
      }
      res.forEach(function(flow){
        names.push(flow.name);
      }, cb);
    },
    function createUser(cb) {
      var user = new User();
      user.gcm = req.params.gcm_token;
      user.flowdockToken = req.params.flowdock_token;
      user.save(cb);
    },
    function sendNames(user, count, cb) {
      res.send(names);
      cb;
    },
  ], next);

};
