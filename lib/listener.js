'use strict';

var pushNotification = require('./pusher.js');
var EventSource = require('eventsource');

var flowdockListener = function(flowdockToken, gcmToken, flowdockFlow) {
  var es = new EventSource('https://' + flowdockToken + '@stream.flowdock.com/flows/' + flowdockFlow);

  es.onmessage = function(e) {
    var message = JSON.parse(e.data);
    if(message.event === "message" || message.event === "line") {
      pushNotification(gcmToken, message.content);
    }
  };

  es.onerror = function(err) {
    console.log('ERROR!', err);
    es.close();
  };
};

module.exports = flowdockListener;
