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
module.exports = function pushNotification(user, content, author, flow, special) {
  if(!special) {
    special = false;
  }

  var apiKey = process.env.GCM_KEY;
  var gcm = new GCM(apiKey);

  var message = {
    'data.content': content,
    'data.flow': flow.name,
    'data.author': author.nick,
    'data.flow_url': flow.web_url,
    'data.own': user.id.toString() === author.id.toString(),
    'data.active': user.active,
  };

  if(special) {
    message['data.special'] = true;
  }

  if(flow.avatar) {
    message['data.avatar'] = flow.avatar;
  }

  // And write the recipient (last, for cool logging)
  message.registration_id = user.gcmToken;

  console.log("MESSAGE-PUSH", "Pushing message to", user.nick, JSON.stringify(message));

  gcm.send(message, function(err, messageId) {
    if(err) {
      console.error("GCM-ERROR", "Something went wrong while pushing GCM message!", err, "(id:", messageId, "), user:", JSON.stringify(user));
    }
  });
};
