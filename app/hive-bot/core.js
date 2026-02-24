const hivejs = require('@hiveio/hive-js');
const { ALL_USERS } = require('./constants.js');

class HiveBotCore {
  constructor({ config, nodes }) {
    this.config = config;
    this.hiveRPCNodes = nodes;
    this.maxReconnectTry = 3;
    this.resetCounter = 0;
    this.rpcCounter = 0;
    this.running = false;
    this.streamId = 0;
  }

  start() {
    if (this.running) return Promise.resolve('Already running');
    console.log('[HiveBot] Starting stream...');
    this.running = true;
    return new Promise((resolve, reject) => {
      try { this._startStream(); resolve('Stream started'); }
      catch (err) { console.error('[HiveBot] Exception in start():', err); reject(err); }
    });
  }

  stop() {
    console.log('[HiveBot] Stopping...');
    this.running = false;
    this.streamId++;
  }

  _startStream() {
    if (!this.hiveRPCNodes?.length) { console.error('[HiveBot] No RPC nodes.'); return; }
    const nodeUrl = this.hiveRPCNodes[this.rpcCounter];
    console.log(`[HiveBot] Connecting to node (${this.rpcCounter}): ${nodeUrl}`);

    hivejs.api.setOptions({ url: nodeUrl, useAppbaseApi: true });
    const currentStreamId = ++this.streamId;
    let lastBlockNum = 0;

    hivejs.api.streamTransactions((err, res) => {
      if (!this.running || currentStreamId !== this.streamId) return;

      if (err) {
        console.error('[HiveBot] Stream error:', err.message || err);
        this.resetCounter++;
        if (this.resetCounter >= this.maxReconnectTry) {
          this._switchRPC();
        } else {
          setTimeout(() => this._startStream(), 3000);
        }
        return;
      }

      this.resetCounter = 0;
      const opCfg = this.config.operation;
      if (!opCfg || typeof opCfg.handler !== 'function') return;
      const handler = opCfg.handler;

      // Handle block transition
      if (res.block_num && res.block_num !== lastBlockNum) {
        lastBlockNum = res.block_num;
        // Since streamTransactions doesn't give block timestamp, we'll use local time or leave it blank
        // Moment is available in app.js anyway.
        handler({
          kind: 'block',
          blockNum: res.block_num,
          timestamp: new Date().toISOString()
        });
      }

      // Emit each operation in the transaction
      for (const op of (res.operations || [])) {
        handler({ kind: 'op', type: op[0], data: op[1] });
      }
    });
  }

  _switchRPC() {
    this.rpcCounter = (this.rpcCounter + 1) % this.hiveRPCNodes.length;
    this.resetCounter = 0;
    this._startStream();
  }
}

module.exports.HiveBotCore = HiveBotCore;
