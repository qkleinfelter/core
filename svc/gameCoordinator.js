/*
* GC manages tracker connections
 */
const config = require('../config');

function GameCoordinator() {
  this.clients = {};
  this.clientsCount = 0;

  this.pingTimeout = config.GC_HEARTBEAT_TIMEOUT;
  this.pingInterval = config.GC_HEARTBEAT_INTERVAL;
}

GameCoordinator.prototype.connect = function connect(req) {
  const id = req.uuid;
  this.clients[id] = req;
  this.clientsCount += 1;
};

GameCoordinator.prototype.disconnect = function disconnect(req) {
  const id = req.uuid;
  delete this.clients[id];
  this.clientsCount -= 1;
};
