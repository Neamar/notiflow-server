'use strict';

var EventSource = require('eventsource');
var async = require('async');
var request = require('supertest');

var pushNotification = require('./pusher.js');

/**
 * Transform an array of hash to some hash, using specified key as identifier.
 * toHash([{id:1, a: "lol"}], "id") == {1: {id:1, a: "lol"}}
 *
 * Linearize key can remove the hash structure entirely, using the specified key as a value.
 * toHash([{id:1, a: "lol"}], "id", "a") == {1: "lol"}
 */
var toHash = function(arr, prop, linearizeKey) {
  var hash = {};

  arr.forEach(function(e) {
    var key = e[prop].toString();
    if(linearizeKey) {
      e = e[linearizeKey];
    }

    hash[key] = e;
  });

  return hash;
};


var flowdockListener = function(user) {
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
        .end(function(err, _users){
          users = toHash(_users.res.body, "id");
          cb(err);
        });
    },
    function listeningStream(cb) {
      console.log("Flows from", user.flowdockToken, '(', user.nick, ')', listenedFlows);

      var es = new EventSource('https://' + user.flowdockToken + '@stream.flowdock.com/flows?filter=' + listenedFlows.join(","));

      es.onmessage = function(e) {
        var message = JSON.parse(e.data);
        if(message.event === "message") {
          console.log("Got new", message.event, "from", user.flowdockToken, message.content);
          pushNotification(user, message.content, users[message.user], toHash(flows, "id", "name")[message.flow]);
        }
        else if(message.event === "comment") {
          console.log("Got new", message.event, "from", user.flowdockToken, message.content.text);
          pushNotification(user, message.content.text, users[message.user], toHash(flows, "id", "name")[message.flow]);
        }
      };

      es.onerror = function(err) {
        console.warn("Error from token", user.flowdockToken, err);
        es.close(cb);
      };
    }
  ],
  function(err){
    if(err) {
      pushNotification(user, "Please sign up again: Flowdock is down or your token has been revoked", {id: 0, nick: "Notiflow"}, "Notiflow");
      user.remove();
    }
  });
};

module.exports = flowdockListener;
