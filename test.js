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


// and let's go
require('./lib/helpers/listener')(user);
