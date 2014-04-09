var user = {
  gcmToken: process.env.GCM_TOKEN,
  flowdockToken: process.env.FLOWDOCK_TOKEN
};
var l = require('./lib/listener');

l(user);
