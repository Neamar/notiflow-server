'use strict';

var restify = require('restify');
var request = require('supertest');
var async = require('async');
var mongoose = require('mongoose');

var User = mongoose.model('User');

var flowdockListener = require('../listener.js');


module.exports.post = function(req, res, next) {
  if(!req.params.gcm_token || !req.params.flowdock_token) {
    return next(new restify.InvalidArgumentError("You must specifiy both gcm_token and flowdock_token."));
  }

  console.log("Initializing new user, flowdock: " + req.params.flowdock_token, ", GCM: " + req.params.gcm_token);

  var flowdockUrl = "https://" + req.params.flowdock_token + "@api.flowdock.com";

  var flows;
  async.waterfall([
    function getFlowsNames(cb) {
      request(flowdockUrl)
        .get('/flows')
        .expect(200)
        .end(cb);
    },
    function generateResponse(res, cb) {
      flows = res.body.map(function(flow) {
        return flow.name;
      });

      console.log("Retrieved flows for user " + req.params.flowdock_token, ": ", flows);

      cb(null);
    },
    function getUserInfo(cb){
      request(flowdockUrl)
        .get('/user')
        .expect(200)
        .end(cb);
    },
    function createUser(res, cb) {
      var user = new User();
      user.id = res.body.id;
      user.nick = res.body.nick;
      user.gcmToken = req.params.gcm_token;
      user.flowdockToken = req.params.flowdock_token;
      user.save(function(err, user) {
        cb(err, flows, user);
      });
    },
    function startListeningFlows(flows, user, cb) {
      flowdockListener(user);
      process.nextTick(function() {
        cb(null, flows);
      });
    },
    function sendNames(flows, cb) {
      res.send(flows);
      cb();
    },
  ], next);

};
