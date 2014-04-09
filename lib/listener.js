'use strict';

var EventSource = require('eventsource');
var async = require('async');
var request = require('supertest');

var pushNotification = require('./pusher.js');


var flowdockListener = function(user) {

  async.waterfall([
    function getFlowsNames(cb) {
      request("https://" + user.flowdockToken + "@api.flowdock.com")
        .get('/flows')
        .expect(200)
        .end(cb);
    },
    function concateNames(res, cb) {
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
          console.log(message);
          pushNotification(user, message.content);
        }
      };

      es.onerror = function(err) {
        console.log('ERROR!', err);
        es.close(cb);
      };
    }
  ]);

};

module.exports = flowdockListener;
