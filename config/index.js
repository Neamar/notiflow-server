// nodeEnv can either be "development", "production" or "test"
var nodeEnv = process.env.NODE_ENV || "development";


// Load environment variables from .env file
var dotenv = require('dotenv');
dotenv.load();


// Port to run the app on. 8000 for development
// 80 for production
var defaultPort = 8000;
if(nodeEnv === "production") {
  defaultPort = 80;
}
var port = process.env.PORT || defaultPort;


// MongoDB configuration
var mongo = process.env.MONGO_URL || ("mongodb://localhost/" + nodeEnv);

module.exports = {
  mongoUrl: mongo,
  port: port,
};
