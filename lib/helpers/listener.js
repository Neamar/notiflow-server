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
module.exports = function flowdockListener(user) {
  console.log("Start listening for", user.flowdockToken);
  var flows = [];
  var listenedFlows;
  var users;

  async.waterfall([
    function getFlowsNames(cb) {
      request("https://" + user.flowdockToken + "@api.flowdock.com")
        .get('/flows')
        .expect(200)
        .end(function(err, _flows) {
          flows = _flows.res.body;
          cb();
        });
    },
    function concatenatelistenedFlows(cb) {
      if(!flows) {
        return cb(new Error("Unable to listen to flows"));
      }

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
    // No cb(), we want infinite looping.
    function listeningStream() {
      var backoff = 250;

      function streamListener() {
        var activeTimeout;
        user.active = false;

        console.log("Flows from", user.flowdockToken, '(', user.nick, '):', listenedFlows.join(', '));

        var flowsName = toHash(flows, "id", "name");

        var es = new EventSource('https://' + user.flowdockToken + '@stream.flowdock.com/flows?filter=' + listenedFlows.join(','));

        es.onmessage = function(e) {
          var message = JSON.parse(e.data);
          var content;

          if(message.event === "activity.user" && message.user === user.id.toString()) {
            if(user.active !== true) {
              console.log("Now active:", user.nick);
            }

            user.active = true;
            clearTimeout(activeTimeout);

            activeTimeout = setTimeout(function() {
              user.active = false;
              console.log("Now inactive:", user.nick);
            }, 90000);
          }

          // File upload
          if(message.event === "file") {
            content = message.content && message.content.file_name;
            content = "[" + (content || "attachment") + "]";

            pushNotification(user, content, users[message.user], flowsName[message.flow], true);
          }

          if(message.event === "message" || message.event === "comment") {
            content = message.content.text || message.content;
            pushNotification(user, content, users[message.user], flowsName[message.flow]);
          }
        };

        es.onerror = function(err) {
          console.error("Error from token", user.flowdockToken, err, ". Will now retry in", backoff, "ms.");
          es.close(function() {
            // Retry with exponential backoff
            backoff *= 2;
            setTimeout(streamListener, backoff);
          });

        };
      }

      streamListener();
    }
  ],
  function(err) {
    if(err) {
      pushNotification(user, "Please sign up again: Flowdock is down or your token has been revoked", {id: 0, nick: "Notiflow"}, "Notiflow");
      user.remove();
    }
  });
};
