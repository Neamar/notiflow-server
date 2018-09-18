'use strict';

// Load configuration and initialize server
var fs = require('fs');
var restify = require('restify');
var mongoose = require('mongoose');

var config = require('./config/');

var lib = require('./lib');
// Connect mongoose
mongoose.connect(config.mongoUrl);

// Create server
var server = restify.createServer({
  formatters: {
    'text/html': function (req, res, body, cb) {
      cb(null, body)
    }
  }
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.gzipResponse());

server.post('/init', lib.handlers.init.post);
server.get('/status', lib.handlers.status.get);

var privacyPolicy = fs.readFileSync(__dirname + '/privacy.html').toString();
server.get('/privacy', function(req, res, next) {
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(privacyPolicy),
    'Content-Type': 'text/html'
  });
  res.end(privacyPolicy);
  next();
});

// Expose the server
module.exports = server;
