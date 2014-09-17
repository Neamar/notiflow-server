'use strict';

var EventSource = require('eventsource');
var async = require('async');
var request = require('supertest');

var pushNotification = require('./pusher');
var toHash = require('./to-hash');


/**
 * Takes a flowdock user as parameter.
 * Will send a pushNotification() for this user on any change.
 */
module.exports = function flowdockListener(user, backoff) {
  backoff = backoff || 250;

  var flows = [];
  var listenedFlows;
  var users;

  async.waterfall([
    function getFlowsNames(cb) {
      request("https://" + user.flowdockToken + "@api.flowdock.com")
        .get('/flows')
        .expect(200)
        .end(function(err, _flows) {
          if(err) {
            return cb(err);
          }
          if(!_flows || !_flows.res || !_flows.res.body) {
            return cb(new Error("Unable to listen to flows"));
          }

          flows = _flows.res.body;
          cb();
        });
    },
    function concatenatelistenedFlows(cb) {
      listenedFlows = flows.map(function(flow) {
        return flow.organization.parameterized_name + "/" + flow.parameterized_name;
      });
      cb();
    },
    function getUsers(cb) {
      request("https://" + user.flowdockToken + "@api.flowdock.com")
        .get('/users')
        .expect(200)
        .end(function(err, _users) {
          if(!err) {
            users = toHash(_users.res.body, "id");
          }

          cb(err);
        });
    },
    function listeningStream(cb) {
      if(user.save) {
        user.lastSuccessfulListening = new Date();
        user.save(function() {});
      }

      var activeTimeout;
      user.active = false;

      console.log("LISTENER-ON", "Flows from", user.flowdockToken, '(', user.nick, '):', listenedFlows.join(', '));

      var flowsData = toHash(flows, "id");

      var es = new EventSource('https://' + user.flowdockToken + '@stream.flowdock.com/flows?filter=' + listenedFlows.join(','));

      es.onmessage = function(e) {
        var message = JSON.parse(e.data);

        var content;

        if(message.event === "activity.user" && message.user === user.id.toString()) {
          if(user.active !== true) {
            console.log("ACTIVITY-CHANGE", "Now active:", user.nick);
          }

          user.active = true;
          clearTimeout(activeTimeout);

          activeTimeout = setTimeout(function() {
            user.active = false;
            console.log("ACTIVITY-CHANGE", "Now inactive:", user.nick);
          }, 90000);
        }

        // File upload
        if(message.event === "file") {
          content = message.content && message.content.file_name;
          content = "[file: " + (content || "attachment") + "]";

          pushNotification(user, content, users[message.user], flowsData[message.flow], true);
        }

        if(message.event === "message" || message.event === "comment") {
          content = message.content.text || message.content;
          pushNotification(user, content, users[message.user], flowsData[message.flow]);
        }
      };

      es.onerror = function(err) {
        es.close();
        cb(err);
      };
    }
  ],
  function handleErrors(err) {
    // This function is only called when an error occurs.
    // Upon normal operation, listeningStream() keeps looping.
    if(err) {
      console.error("TOKEN-ERROR", "Error from token", user.flowdockToken, err, ". Will now retry in", backoff, "ms. Error:", err);

      // Retry with exponential backoff
      backoff *= 4;
      if(backoff < 3600000) {
        setTimeout(function() {
          flowdockListener(user, backoff);
        }, backoff);
      }
    }
  });
};
