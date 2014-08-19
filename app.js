'use strict';

// Load configuration and initialize server
var restify = require('restify');
var mongoose = require('mongoose');

var config = require('./config/');

var lib = require('./lib');

// Connect mongoose
mongoose.connect(config.mongoUrl);

// Create server
var server = restify.createServer();

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.gzipResponse());

server.post('/init', lib.handlers.init.post);
server.get('/status', lib.handlers.status.get);

// Expose the server
module.exports = server;
