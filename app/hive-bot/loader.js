const { HiveBotCore } = require('./core.js');
const { ALL_USERS } = require('./constants.js');

function getConfig(args) {
  let targets;
  let handler;

  if (args.length > 2) {
    throw new Error('Your event function should only have one or two arguments');
  }

  if (typeof args[0] === 'function') {
    targets = ALL_USERS;
    handler = args[0];
  } else {
    targets = typeof args[0] === 'string' ? [args[0]] : args[0];
    handler = args[1];
  }

  return { handler, targets };
}

class HiveBot {
  constructor(botConfig) {
    this.username = botConfig.hiveUsername;
    this.hiveRPCNodes = botConfig.hiverpc;
    this.config = {};
    this.loader = null;
  }

  // Register a handler for ALL operations (wildcard)
  onOperation(...args) {
    this.config.operation = getConfig(args);
  }

  // Fine-grained handlers kept for compatibility / future use
  onPost(...args) {
    this.config.post = getConfig(args);
  }

  onComment(...args) {
    this.config.comment = getConfig(args);
  }

  onCustomJson(...args) {
    this.config.customjson = getConfig(args);
  }

  stop() {
    if (this.loader) {
      this.loader.stop();
    }
  }

  start() {
    this.loader = new HiveBotCore({
      username: this.username,
      config: this.config,
      nodes: this.hiveRPCNodes,
    });

    return this.loader.start();
  }
}

module.exports.HiveBot = HiveBot;
