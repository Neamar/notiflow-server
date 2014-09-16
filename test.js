"use strict";
/**
 * File to test notification and push.
 * Create a fake user and listen on his flow.
 */

// Auto-load models, config and env
require('./app');


// Create a fake user
var user = {
  gcmToken: process.env.GCM_TOKEN,
  flowdockToken: process.env.FLOWDOCK_TOKEN,
  nick: process.env.FLOWDOCK_NICK,
  id: process.env.FLOWDOCK_ID
};


// var pushNotification = require('./lib/helpers/pusher');
// var author = {
//   id: "notiflow",
//   nick: "Notiflow"
// };

// var fakeFlow = {
//   name: "Welcome to Notiflow!",
// };
// pushNotification(user, "Your 500 flows will be monitored.", author, fakeFlow);


// and let's go
require('./lib/helpers/listener')(user);
