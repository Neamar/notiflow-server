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
      var flows = "";
      res.body.map(function(flow) {
        flows = flows + ', ' + flow.name;
      });

      cb(null, flows);
    },
    function listeningStream(flows, cb){
      var es = new EventSource('https://' + user.flowdockToken + '@stream.flowdock.com/flows/' + flows);

      es.onmessage = function(e) {
        var message = JSON.parse(e.data);
        if(message.event === "message" || message.event === "line") {
          console.log("Got new message from", user.flowdockToken, message);
          pushNotification(user, message.content);
        }
      };

      es.onerror = function(err) {
        console.log("Error from token", user.flowdockToken, err);
        async.parallel([
          function closeListener(cb){
            es.close(cb);
          },
          function deleteUser(cb){
            user.delete(cb);
          }
        ], cb);

      };
    }
  ]);

};

module.exports = flowdockListener;
