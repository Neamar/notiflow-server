'use strict';

var EventSource = require('eventsource');
var async = require('async');
var request = require('supertest');
var rarity = require("rarity");

var messageHandlers = require('./handlers');
var pushNotification = require('./pusher');
var toHash = require('./to-hash');
var stringToColor = require('./flow-color');

/*
 * Extract flow data, whether it's a 1 to 1 or a flow
 */
var getFlowDataFromMessage = function(message, authorData, currentUser, users, flowsData) {
  var flowData;
  // Is it a 1-to-1?
  if(!message.flow) {
    // If the author of this notification is the current user, we need to reverse authorData, else we'll get 1-to-1 with ourselves
    var oneToOneRecipient = (authorData.id.toString() === currentUser.id.toString() ? users[message.to] : authorData);
    flowData = {
      name: '@' + oneToOneRecipient.nick,
      web_url: 'https://www.flowdock.com/app/private/' + oneToOneRecipient.id,
      avatar: oneToOneRecipient.avatar,
      private: true
    };
  }
  else {
    // Standard flow messages
    flowData = flowsData[message.flow];
    flowData.avatar = authorData.avatar;
  }

  return flowData;
};

/**
 * Determine if a message has a specified tag for a user
 */
var isUserTagged = function isUserTagged(tag, message, user) {
  var id = user.id.toString();

  return message.tags.some(function(messageTag) {
    return messageTag.search(tag + ":" + id) !== -1;
  });
};

/**
 * Create notification message to be sent via GCM
 */
var createNotificationData = function createMessage(message, user, author, flow) {
  var data = {
    author: author.nick,
    flow: flow.name,
    color: stringToColor(flow.name),
    flow_url: flow.web_url,
    own: user.id.toString() === author.id.toString(),
    mentioned: isUserTagged(":user", message, user),
    private: flow.private,
    active: user.active
  };

  if(flow.avatar) {
    data.avatar = flow.avatar;
  }


  var handler = messageHandlers[message.event];
  if(handler) {
    handler(message, data);
  }

  return data;
};


/**
 * Takes a flowdock user as parameter.
 * Will send a pushNotification() for this user on any change.
 */
module.exports = function flowdockListener(user, backoff) {
  backoff = backoff || 250;

  var flows = [];
  var listenedFlows;
  var users;

  async.waterfall([
    function getFlowsNames(cb) {
      request("https://" + user.flowdockToken + "@api.flowdock.com")
        .get('/flows')
        .expect(200)
        .end(cb);
    },
    function registerFlows(_flows, cb) {
      if(!_flows || !_flows.res || !_flows.res.body) {
        return cb(new Error("Unable to listen to flows"));
      }

      // Save flows on upper scope for easier retrieval
      flows = _flows.res.body;

      // Generate parameterized list of flow on which we want to listen
      listenedFlows = flows.map(function(flow) {
        return flow.organization.parameterized_name + "/" + flow.parameterized_name;
      });

      cb();
    },
    function getUsers(cb) {
      request("https://" + user.flowdockToken + "@api.flowdock.com")
        .get('/users')
        .expect(200)
        .end(cb);
    },
    function registerUsers(_users, cb) {
      users = toHash(_users.res.body, "id");
      cb();
    },
    function updateUserModel(cb) {
      // Update the User model record, unless we're running in a fake environment
      if(user.save) {
        user.lastSuccessfulListening = new Date();
        user.flows = listenedFlows;
        user.pendingMessages = user.pendingMessages || {};
        user.save(rarity.slice(1, cb));
      }
      else {
        cb();
      }
    },
    function listeningStream(cb) {
      // Main function, basically a while(true) loop, waiting for notifications
      // from the EventSource and never stopping.
      var activeTimeout;
      user.active = false;

      console.log("LISTENER-ON", "Flows from", user.flowdockToken, '(', user.nick, '):', listenedFlows.join(', '));

      var flowsData = toHash(flows, "id");

      var es = new EventSource('https://' + user.flowdockToken + '@stream.flowdock.com/flows?user=1&filter=' + listenedFlows.join(','));

      module.exports.es[user.flowdockToken] = es;

      var errorcb = function errorcb(err) {
        if(err && err.toString().indexOf('NotRegistered') !== -1) {
          console.error("GCM-ERROR", "Client has unregistered, uninstalled or has been unavailable for too long. Listening will be stopped.");
          if(user.remove) {
            console.error("USER-REMOVED", "Permanently removing user:" + JSON.stringify(user));
            user.remove(function() {});
          }
          es.close();
          // GC this function stack
          cb();
        }
      };

      es.onmessage = function(e) {

        var message = JSON.parse(e.data);

        var flowData;
        var notificationData;

        // Messages for team inbox, skip that
        // Can also be, in some rare case, undefined, for weird reasons.
        // Ignore that too
        if(message.user === "0" || !message.user) {
          return;
        }

        var authorData = users[message.user];

        // Unknown user == restart the loop to retrieve an up to date /users list.
        if(!authorData) {
          console.log("Got a new user in the organization... restarting. UserID:", message.user + ". Dropped message:" + JSON.stringify(message));
          es.close();
          return cb(new Error("Unknown user."));
        }

        // Handle activity change
        if(message.event === "activity.user" && message.user === user.id.toString()) {
          if(user.active !== true) {
            console.log("ACTIVITY-CHANGE", "Now active:", user.nick);
          }

          user.active = true;
          clearTimeout(activeTimeout);

          activeTimeout = setTimeout(function() {
            user.active = false;
            console.log("ACTIVITY-CHANGE", "Now inactive:", user.nick);
          }, 135000);

          // Do we need to remove a previously displayed notification?
          var lastActivity = new Date(message.content && message.content.last_activity ? message.content.last_activity : 0);
          if(user.pendingMessages[message.flow] && user.pendingMessages[message.flow] < lastActivity) {
            delete user.pendingMessages[message.flow];
            user.markModified('pendingMessages');
            user.save(function() {});

            console.log("MESSAGE-SEEN", "Dismiss previous message from " + user.nick + " on flow " + flowsData[message.flow].name);
            pushNotification(user, {
              flow: flowsData[message.flow].name,
              seen: true
            }, errorcb);
          }
        }

        // Restrict notifications to specified events
        if(Object.keys(messageHandlers).indexOf(message.event) === -1) {
          return;
        }


        flowData = getFlowDataFromMessage(message, authorData, user, users, flowsData);
        notificationData = createNotificationData(message, user, authorData, flowData);

        // If it's a flow conversation, not a 1-to-1, and not our own message
        if(flowsData[message.flow] && !notificationData.private && !notificationData.own) {
          // Register last messages, so we can send "seen" commands later on activity.
          user.pendingMessages[message.flow] = new Date();
          user.markModified('pendingMessages');
          user.save(function() {});
        }

        pushNotification(user, notificationData, errorcb);

      };

      es.onerror = function(err) {
        es.close();
        cb(err);
      };
    }
  ],
  function handleErrors(err) {
    // This function is only called when an error occurs.
    // Upon normal operation, listeningStream() keeps looping.
    if(err) {
      delete module.exports.es[user.flowdockToken];
      console.error("TOKEN-ERROR", "Error from token", user.flowdockToken,  "(", user.nick, "). Will now retry in", backoff, "ms. Error:", err.toString());

      // Retry with exponential backoff
      backoff *= 4;
      if(backoff < 3600000) {
        setTimeout(function() {
          flowdockListener(user, backoff);
        }, backoff + 4000 * Math.random());
      }
      else {
        if(err.toString().indexOf("got 401") > 0 && user.remove) {
          console.error("USER-REMOVED", "Invalid token, permanently removing user:" + JSON.stringify(user));
          user.remove(function() {});
        }
      }
    }
  });
};

module.exports.es = {};
