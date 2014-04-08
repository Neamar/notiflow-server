'use strict';

var pushNotification = require('./pusher.js');
var EventSource = require('eventsource');

var es = new EventSource('https://9b9d6c8656c9e447b759fc6a3ad27ffd@stream.flowdock.com/flows/boostinlyon/notiflow');

es.onmessage = function(e) {
  var message = e.data;
  if(message.event === "message" || message.event === "line") {
    pushNotification('', message.content);
  }
};
es.onerror = function(err) {
  console.log('ERROR!', err);
};
