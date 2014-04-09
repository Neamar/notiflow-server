'use strict';

var EventSource = require('eventsource');
var async = require('async');
var request = require('supertest');

var pushNotification = require('./pusher.js');


var flowdockListener = function(flowdockToken, gcmToken) {

  async.waterfall([
    function getFlowsNames(cb) {
      request("https://" + flowdockToken + "@api.flowdock.com")
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
      var es = new EventSource('https://' + flowdockToken + '@stream.flowdock.com/flows/' + flows);

      es.onmessage = function(e) {
        var message = JSON.parse(e.data);
        message.author;
        if(message.event === "message" || message.event === "line") {
          pushNotification(gcmToken, message.content);
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
