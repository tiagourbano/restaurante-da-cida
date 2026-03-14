const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const eventLoopLag = new client.Gauge({
  name: 'node_event_loop_lag_ms',
  help: 'Event loop lag in milliseconds'
});

register.registerMetric(eventLoopLag);

function startEventLoopMonitor() {
  const interval = 1000;
  let lastTime = process.hrtime.bigint();

  setInterval(() => {

    const now = process.hrtime.bigint();
    const delta = Number(now - lastTime) / 1e6;

    const lag = delta - interval;

    eventLoopLag.set(lag);

    lastTime = now;

  }, interval).unref();
}

module.exports = { register, startEventLoopMonitor };