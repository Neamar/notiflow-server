if(!process.env.GCM_KEY) {
  console.log("Set GCM key.");
  process.exit();
}
var pushNotification = function(recipient, content) {
  var apiKey = process.env.GCM_KEY;
  var gcm = new GCM(apiKey);

  var message = {
    registration_id: , // required
    'data.content': content,
  };

  gcm.send(message, function(err, messageId){
    if (err) {
      console.log("Something has gone wrong!");
    } else {
      console.log("Sent with message ID: ", messageId);
    }
  });
};


module.exports = pushNotification;
