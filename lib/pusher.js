'use strict';

var GCM = require('gcm').GCM;

if(!process.env.GCM_KEY) {
  console.log("Set GCM key in process.env.GCM_KEY.");
  process.exit();
}

var pushNotification = function(user, content, author) {

  var apiKey = process.env.GCM_KEY;
  var gcm = new GCM(apiKey);

  var message = {
    registration_id: user.gcmToken,
    'data.content': content,
    'data.author': author,
  };


  console.log("Pushing message", message, user);
  gcm.send(message, function(err, messageId) {
    if(err) {
      console.log("Something has gone wrong! " + err);
      user.remove();
    }
    else {
      console.log("Sent with message ID: ", messageId);
    }
  });
};


module.exports = pushNotification;
