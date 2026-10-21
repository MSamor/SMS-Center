import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { cipherBox } from './crypto.js';
import { openDatabase, cleanup } from './db.js';
import { createServer } from 'node:http';
import { createStream } from './stream.js';
const config = loadConfig();
config.box = cipherBox(config.key);
const db = await openDatabase(config);
cleanup(db);
const timer = setInterval(() => {
  try {
    cleanup(db);
  } catch (error) {
    console.error('清理失败：', error.message);
  }
}, 3600000);
timer.unref();
let stream;
const app = createApp({ db, config, publishMessage: (message) => stream.publish(message) });
const server = createServer(app);
stream = createStream({ server, db });
server.listen(config.port, config.host, () =>
  console.log(`SMS Center listening on ${config.host}:${config.port}`),
);
function shutdown() {
  clearInterval(timer);
  stream.close();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
