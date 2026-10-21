import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { releaseVersion } from './release-version.js';

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../extension');
const files = [
  'manifest.json',
  'background.js',
  'common.js',
  'options.html',
  'options.js',
  'popup.html',
  'popup.js',
  'style.css',
  'icon16.png',
  'icon48.png',
  'icon128.png',
];

export function extensionVersion(tag) {
  const info = releaseVersion(tag);
  return `${info.version.split('-')[0]}.${info.versionCode % 1000}`;
}

export function buildExtension(tag, destination) {
  const info = releaseVersion(tag);
  const output = path.resolve(destination);
  if (fs.existsSync(output)) throw new Error(`插件产物已存在：${output}`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'sms-center-extension-'));
  try {
    for (const file of files) {
      const source = path.join(extensionRoot, file);
      if (!fs.statSync(source).isFile() || !fs.statSync(source).size)
        throw new Error(`插件文件为空：${file}`);
      fs.copyFileSync(source, path.join(staging, file));
    }
    const manifestPath = path.join(staging, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.manifest_version !== 3 || !manifest.background?.service_worker)
      throw new Error('插件 Manifest V3 配置无效');
    manifest.version = extensionVersion(tag);
    manifest.version_name = info.version;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    execFileSync('zip', ['-q', '-X', output, ...files], { cwd: staging });
    execFileSync('unzip', ['-tq', output]);
    return output;
  } catch (error) {
    if (fs.existsSync(output)) fs.unlinkSync(output);
    throw error;
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , tag, output] = process.argv;
  if (!tag || !output) throw new Error('Usage: node scripts/package-extension.js TAG OUTPUT.zip');
  console.log(`Chrome 插件构建完成：${buildExtension(tag, output)}`);
}
