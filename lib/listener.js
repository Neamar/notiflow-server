'use strict';

var EventSource = require('eventsource');
var async = require('async');
var request = require('supertest');

var pushNotification = require('./pusher.js');


var flowdockListener = function(user) {
  console.log("Start listening for", user.flowdockToken);
  async.waterfall([
    function getFlowsNames(cb) {
      request("https://" + user.flowdockToken + "@api.flowdock.com")
        .get('/flows')
        .expect(200)
        .end(cb);
    },
    function concatenateFlows(res, cb) {
      var flows = [];
      flows = res.body.map(function(flow) {
        return flow.organization.parameterized_name + "/" + flow.parameterized_name;
      });

      cb(null, flows);
    },
    function listeningStream(flows, cb) {
      console.log("Flows from", user.flowdockToken, flows);

      var es = new EventSource('https://' + user.flowdockToken + '@stream.flowdock.com/flows?filter=' + flows.join(","));

      es.onmessage = function(e) {
        var message = JSON.parse(e.data);
        if(message.event === "message" || message.event === "line") {
          console.log("Got new message from", user.flowdockToken, message);
          pushNotification(user, message.content);
        }
      };

      es.onerror = function(err) {
        console.log("Error from token", user.flowdockToken, err);
        console.log("User will be removed.");
        async.parallel([
          function closeListener(cb){
            es.close(cb);
          },
          function deleteUser(cb){
            user.remove(cb);
          }
        ], cb);

      };
    }
  ]);

};

module.exports = flowdockListener;
