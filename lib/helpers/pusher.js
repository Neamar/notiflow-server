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
  // Skip our own message notification
  if(user && user.id && user.id.toString() === author.id.toString()) {
    return;
  }
  var apiKey = process.env.GCM_KEY;
  var gcm = new GCM(apiKey);

  var message = {
    registration_id: user.gcmToken,
    'data.content': content,
    'data.author': author.nick,
    'data.flow': flow,
  };


  console.log("Pushing message to", user);
  gcm.send(message, function(err, messageId) {
    if(err) {
      console.warn("Something went wrong while pushing GCM message! " + err);
      user.remove();
    }
    else {
      console.log("Sent with message ID: ", messageId);
    }
  });
};
