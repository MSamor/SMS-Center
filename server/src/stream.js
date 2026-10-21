import { WebSocket, WebSocketServer } from 'ws';
import { authorizeToken, queryScope, scopeAllows } from './query-access.js';
import { getSettings } from './db.js';

const STREAM_PATH = '/api/v1/codes/stream';

export function createStream({ server, db }) {
  const stream = new WebSocketServer({
    noServer: true,
    maxPayload: 4096,
    perMessageDeflate: false,
  });
  const audit = (action, token, status, ip, message = null) => {
    try {
      db.prepare(
        `INSERT INTO audits (token_id,token_name,action,signature,device_id,status,ip,duration_ms,message_id,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        token?.id || null,
        token?.name || null,
        action,
        message?.signature || null,
        message?.deviceId || null,
        status,
        ip || '',
        0,
        message?.id || null,
        Date.now(),
      );
    } catch (error) {
      console.error('Stream audit write failed:', error.message);
    }
  };
  const reject = (socket, code) => {
    socket.end(
      `HTTP/1.1 ${code} ${code === 403 ? 'Forbidden' : 'Service Unavailable'}\r\nConnection: close\r\n\r\n`,
    );
  };
  server.on('upgrade', (request, socket, head) => {
    let pathname;
    try {
      pathname = new URL(request.url, 'http://localhost').pathname;
    } catch {
      socket.destroy();
      return;
    }
    if (pathname !== STREAM_PATH) {
      socket.destroy();
      return;
    }
    const origin = request.headers.origin;
    if (origin && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) {
      audit('stream.connect', null, 403, request.socket.remoteAddress);
      reject(socket, 403);
      return;
    }
    if (stream.clients.size >= 200) {
      audit('stream.connect', null, 429, request.socket.remoteAddress);
      reject(socket, 503);
      return;
    }
    stream.handleUpgrade(request, socket, head, (client) => {
      client.ip = request.socket.remoteAddress || '';
      client.isAlive = true;
      client.on('error', () => {});
      client.on('pong', () => {
        client.isAlive = true;
      });
      const authTimeout = setTimeout(() => {
        if (!client.tokenId) {
          audit('stream.connect', null, 401, client.ip);
          client.close(4401, 'Authentication timeout');
        }
      }, 7000);
      authTimeout.unref();
      client.on('close', () => clearTimeout(authTimeout));
      client.on('message', (buffer, binary) => {
        let input;
        try {
          if (binary) throw new Error('Binary frames are not supported');
          input = JSON.parse(buffer.toString());
          if (!input || typeof input !== 'object' || Array.isArray(input))
            throw new Error('Invalid frame');
        } catch {
          client.close(1008, 'Invalid frame');
          return;
        }
        if (!client.tokenId) {
          if (input.type !== 'auth' || typeof input.token !== 'string') {
            client.close(1008, 'Authenticate first');
            return;
          }
          let token;
          try {
            token = authorizeToken(db, input.token, 'query');
            const count = [...stream.clients].filter((peer) => peer.tokenId === token.id).length;
            if (count >= 3) {
              audit('stream.connect', token, 429, client.ip);
              client.close(4429, 'Too many connections');
              return;
            }
          } catch (error) {
            audit('stream.connect', null, error.status || 401, client.ip);
            client.close(error.status === 403 ? 4403 : 4401, 'Unauthorized');
            return;
          }
          client.tokenId = token.id;
          clearTimeout(authTimeout);
          db.prepare('UPDATE tokens SET last_used_at=? WHERE id=?').run(Date.now(), token.id);
          audit('stream.connect', token, 101, client.ip);
          client.send(JSON.stringify({ type: 'ready' }));
        } else if (input.type === 'ping') {
          client.send(JSON.stringify({ type: 'pong' }));
        } else {
          client.close(1008, 'Unsupported frame');
        }
      });
    });
  });
  const heartbeat = setInterval(() => {
    for (const client of stream.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      if (!client.isAlive) {
        client.terminate();
        continue;
      }
      if (client.tokenId) {
        const token = db.prepare('SELECT * FROM tokens WHERE id=?').get(client.tokenId);
        if (!token || token.revoked_at || (token.expires_at && token.expires_at <= Date.now())) {
          client.close(4401, 'Token expired or revoked');
          continue;
        }
      }
      client.isAlive = false;
      client.ping();
    }
  }, 25000);
  heartbeat.unref();
  return {
    publish(message) {
      const now = Date.now();
      const age = getSettings(db).codeMaxAgeSeconds * 1000;
      if (message.receivedAt > now || message.receivedAt + age <= now) return;
      const device = db.prepare('SELECT enabled FROM devices WHERE id=?').get(message.deviceId);
      if (!device?.enabled) return;
      for (const client of stream.clients) {
        if (!client.tokenId || client.readyState !== WebSocket.OPEN) continue;
        const token = db.prepare('SELECT * FROM tokens WHERE id=?').get(client.tokenId);
        if (!token || token.revoked_at || (token.expires_at && token.expires_at <= now)) {
          client.close(4401, 'Token expired or revoked');
          continue;
        }
        if (!scopeAllows(queryScope(token), message.signature, message.deviceId)) continue;
        client.send(JSON.stringify({ type: 'code.created', ...message }));
        audit('stream.push', token, 200, client.ip, message);
      }
    },
    close() {
      clearInterval(heartbeat);
      for (const client of stream.clients) client.terminate();
      stream.close();
    },
  };
}
