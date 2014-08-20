'use strict';

var GCM = require('gcm').GCM;

// Check for env.
if(!process.env.GCM_KEY) {
  console.error("Set GCM key in process.env.GCM_KEY.");
  process.exit();
}


/**
 * Push a notification to the user phone
 */
module.exports = function pushNotification(user, content, author, flow) {
  var apiKey = process.env.GCM_KEY;
  var gcm = new GCM(apiKey);

  var message = {
    registration_id: user.gcmToken,
    'data.content': content,
    'data.author': author.nick,
    'data.flow': flow,
    'data.own': user.id.toString() === author.id.toString(),
    'data.active': user.active
  };

  console.log("Pushing message\n", message);

  gcm.send(message, function(err, messageId) {
    if(err) {
      console.warn("Something went wrong while pushing GCM message! ", err, "(id:", messageId, ")");
      user.remove();
    }
  });
};
