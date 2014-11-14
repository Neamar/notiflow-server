"use strict";

function handleMessage(message, data) {
  data.content = message.content.text || message.content;
}

function handleFile(message, data) {
  var content = message.content && message.content.file_name;
  data.content = "[file: " + (content || "attachment") + "]";
  data.special = true;
}

/**
 * Message content handlers for notification display
 */
module.exports = {
  message:  handleMessage,
  comment:  handleMessage,
  file:     handleFile
};
