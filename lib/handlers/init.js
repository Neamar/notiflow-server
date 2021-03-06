'use strict';

var restify = require('restify');
var rarity = require("rarity");
var request = require('supertest');
var async = require('async');
var mongoose = require('mongoose');

var User = mongoose.model('User');

var flowdockListener = require('../helpers/listener.js');
var pushNotification = require('../helpers/pusher.js');


var registerNewUser = function registerNewUser(gcmToken, flowdockToken, cb) {
  console.log("Initializing new user, flowdock: " + flowdockToken, ", GCM: " + gcmToken);
  var flowdockUrl = "https://" + flowdockToken + "@api.flowdock.com";

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

      console.log("Retrieved flows for user " + flowdockToken, ": ", flows);

      cb(null);
    },
    function getUserInfo(cb) {
      request(flowdockUrl)
        .get('/user')
        .expect(200)
        .end(cb);
    },
    function createUser(res, cb) {
      var user = new User();
      user.id = res.body.id;
      user.nick = res.body.nick;
      user.gcmToken = gcmToken;
      user.flowdockToken = flowdockToken;
      user.flows = flows;
      user.save(rarity.slice(2, cb));
    },
    function startListeningFlows(user, cb) {
      flowdockListener(user);

      pushNotification(user, {
        author: "Notiflow",
        flow: "Welcome to Notiflow!",
        content: "Your " + flows.length + " flows will be monitored."
      });
      cb(null, user);
    },
  ], cb);
};


module.exports.post = function(req, res, next) {
  if(!req.params.gcm_token || !req.params.flowdock_token) {
    return next(new restify.InvalidArgumentError("You must specify both gcm_token and flowdock_token."));
  }

  async.waterfall([
    function checkIfTokenAlreadyExists(cb) {
      User.findOne({flowdockToken: req.params.flowdock_token}, cb);
    },
    function registerOrUpdateUser(user, cb) {
      if(!user) {
        registerNewUser(req.params.gcm_token, req.params.flowdock_token, cb);
      }
      else {
        if(user.gcmToken !== req.params.gcm_token) {
          console.log("Updating existing user", user.nick, "flowdock: " + req.params.flowdock_token, ", GCM: " + req.params.gcm_token);
          user.gcmToken = req.params.gcm_token;
          user.save(cb);
          // The old listener will miserably fail, as the token has been updated and the previous one is not mapping to anything anymore.
          // We register a new listener and close the old one
          flowdockListener(user);
          if(flowdockListener.es[user.flowdockToken] && flowdockListener.es[user.flowdockToken].close) {
            console.log("Closing existing connexion using old GCM token.");
            flowdockListener.es[user.flowdockToken].close();
          }

        }
        else {
          console.log("Consolidating existing user:", user.nick, "flowdock: " + req.params.gcm_token);
          cb(null, user);
        }
      }
    },
    function sendFlows(user, cb) {
      res.send(user.flows);
      cb();
    }
  ], next);
};
