exports.config = {
  agent_enabled: "NEW_RELIC_LICENSE_KEY" in process.env,
  app_name: require('./package.json').name,
  capture_params: true,
};
