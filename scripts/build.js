import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'admin', 'dist');
const target = path.join(root, 'server', 'public');

// Build first, so a failed Vue build never removes the last working static bundle.
const npm = process.env.npm_execpath;
await new Promise((resolve, reject) => {
  const args = ['run', 'build', '--workspace', '@sms-center/admin'];
  const child = npm
    ? spawn(process.execPath, [npm, ...args], { cwd: root, stdio: 'inherit' })
    : spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
        cwd: root,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
  child.on('error', reject);
  child.on('exit', (code) =>
    code === 0 ? resolve() : reject(new Error(`Vue build failed (${code})`)),
  );
});
await fs.access(path.join(source, 'index.html'));
const staging = await fs.mkdtemp(path.join(root, 'server', '.public-build-'));
const backup = `${staging}-previous`;
let backedUp = false;
let installed = false;
try {
  await fs.cp(source, staging, { recursive: true });
  try {
    await fs.rename(target, backup);
    backedUp = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  try {
    await fs.rename(staging, target);
    installed = true;
  } catch (error) {
    if (backedUp) await fs.rename(backup, target);
    throw error;
  }
  console.log(
    'Vue bundle copied to server/public. Run npm start to serve the UI and API together.',
  );
} finally {
  await fs.rm(staging, { recursive: true, force: true });
  // Retain the previous bundle if rollback itself fails (e.g. filesystem permissions).
  if (installed) await fs.rm(backup, { recursive: true, force: true });
}
