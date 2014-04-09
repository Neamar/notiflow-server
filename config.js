// node_env can either be "development", "production" or "test"
var node_env = process.env.NODE_ENV || "development";

// Port to run the app on. 8000 for development
// (Vagrant syncs this port)
// 80 for production
var default_port = 8000;
if(node_env === "production") {
  default_port = 80;
}
var port = process.env.PORT || default_port;


// MongoDB configuration
var mongo = process.env.MONGO_URL || ("mongodb://localhost/" + node_env);

module.exports = {
  mongoUrl: mongo,
  port: port,
};