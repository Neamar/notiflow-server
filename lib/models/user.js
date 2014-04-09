'use strict';
var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
  gcmToken: String,
  flowdockToken: String,
});

UserSchema.index({gcmToken: 1, flowdockToken: 1}, {unique: true});

module.exports = mongoose.model('User', UserSchema);
