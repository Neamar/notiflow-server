'use strict';
var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
  gcm: String,
  flowdockToken: String,
});


module.exports = mongoose.model('User', UserSchema);
