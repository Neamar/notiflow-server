'use strict';

var autoload = require('auto-load');

// Autoload models first
autoload(__dirname + "/models");

// Return all files
module.exports = autoload(__dirname);
