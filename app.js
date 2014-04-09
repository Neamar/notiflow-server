'use strict';

// Load configuration and initialize server
var restify = require('restify');
var mongoose = require('mongoose');
var autoload = require('auto-load');

var config = require('./config.js');

var handlers = autoload(__dirname + '/lib/handlers');

// Connect mongoose
mongoose.connect(config.mongoUrl);

// Create server
var server = restify.createServer();

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.gzipResponse());

server.post('/init', handlers.init.post);

// Expose the server
module.exports = server;
