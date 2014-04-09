'use strict';
var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
  gcm: String,
  flowdockToken: String,
});

UserSchema.index({gcm: 1, flowdockToken: 1}, {unique: true});

module.exports = mongoose.model('User', UserSchema);
