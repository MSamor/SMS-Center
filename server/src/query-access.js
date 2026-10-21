import { digest } from './crypto.js';

const denied = (status, code, message) => Object.assign(new Error(message), { status, code });

export function authorizeToken(db, value, kind) {
  if (!value || !/^(upl|qry)_[A-Za-z0-9_-]{20,96}$/.test(value))
    throw denied(401, 'UNAUTHORIZED', '请提供有效的 Token');
  const row = db.prepare('SELECT * FROM tokens WHERE hash=?').get(digest(value));
  if (!row || row.revoked_at || (row.expires_at && row.expires_at <= Date.now()))
    throw denied(401, 'UNAUTHORIZED', 'Token 无效、已撤销或已过期');
  if (kind && row.kind !== kind) throw denied(403, 'TOKEN_SCOPE', 'Token 类型不允许访问该接口');
  return row;
}

export function queryScope(token) {
  return { signatures: JSON.parse(token.signatures), devices: JSON.parse(token.device_ids) };
}

export function assertQueryFilter(scope, signature, deviceId) {
  if (signature && !scope.signatures.includes('*') && !scope.signatures.includes(signature))
    throw denied(403, 'SIGNATURE_DENIED', 'Token 没有该短信签名的查询权限');
  if (deviceId && scope.devices.length && !scope.devices.includes(deviceId))
    throw denied(403, 'DEVICE_DENIED', 'Token 没有该设备的查询权限');
}

export function scopeAllows(scope, signature, deviceId) {
  return (
    (scope.signatures.includes('*') || scope.signatures.includes(signature)) &&
    (!scope.devices.length || scope.devices.includes(deviceId))
  );
}

export function recentClauses(scope, now, ageSeconds, signature, deviceId) {
  const clauses = ['m.received_at>=?', 'm.received_at<=?', 'd.enabled=1'];
  const args = [now - ageSeconds * 1000, now];
  if (signature) {
    clauses.push('m.signature=?');
    args.push(signature);
  } else if (!scope.signatures.includes('*')) {
    clauses.push(`m.signature IN (${scope.signatures.map(() => '?').join(',')})`);
    args.push(...scope.signatures);
  }
  if (deviceId) {
    clauses.push('m.device_id=?');
    args.push(deviceId);
  }
  if (scope.devices.length) {
    clauses.push(`m.device_id IN (${scope.devices.map(() => '?').join(',')})`);
    args.push(...scope.devices);
  }
  return { where: clauses.join(' AND '), args };
}
