import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseVersion, validateImage } from '../release-version.js';
import { releaseNotes } from '../release-notes.js';
import { buildExtension, extensionVersion } from '../package-extension.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';

test('version parsing gives deterministic increasing codes through pre-release stages', () => {
  const tags = [
    'v1.0.0-alpha.1',
    'v1.0.0-alpha.199',
    'v1.0.0-beta.1',
    'v1.0.0-rc.1',
    'v1.0.0',
    'v1.0.1-alpha.1',
    'v1.1.0',
    'v2.0.0',
  ];
  const codes = tags.map((tag) => releaseVersion(tag).versionCode);
  assert.deepEqual(
    codes,
    [...codes].sort((a, b) => a - b),
  );
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(releaseVersion('v1.0.0').prerelease, false);
  assert.equal(releaseVersion('v1.0.0-rc.1').prerelease, true);
  assert.equal(releaseVersion('v1.0.0').apkName, 'sms-center-v1.0.0.apk');
  assert.equal(extensionVersion('v1.0.0'), '1.0.0.999');
  assert.equal(extensionVersion('v1.2.3-rc.1'), '1.2.3.401');
  assert.equal(releaseVersion('v199.99.99').versionCode < 2100000000, true);
});
test('unsafe or ambiguous tags and image names are rejected', () => {
  for (const tag of [
    '',
    'main',
    'v01.2.3',
    'v1.2',
    'v1.2.3+meta',
    'v1.2.3-beta.0',
    'v1.2.3-rc.200',
    'v200.0.0',
    'v1.100.0',
    'v1.0.100',
    'v1.0.0\nsha=evil',
    '--help',
  ])
    assert.throws(() => releaseVersion(tag));
  assert.equal(validateImage('example-user/sms-center'), 'example-user/sms-center');
  for (const image of [
    '',
    'User/image',
    'image',
    'docker.io/user/image',
    'user/image:latest',
    'user/image\nevil',
  ])
    assert.throws(() => validateImage(image));
});
test('release notes contain reproducible APK, deployment, initialization and backup instructions', () => {
  const config = {
    tag: 'v1.2.3',
    image: 'example/sms-center',
    digest: 'sha256:' + 'a'.repeat(64),
    repository: 'MSamor/SMS-Center',
    sha: 'b'.repeat(40),
    changes: '- 修复上传问题',
  };
  const text = releaseNotes(config);
  for (const expected of [
    'sms-center-v1.2.3.apk',
    'sms-center-chrome-v1.2.3.zip',
    '插件 ZIP 在独立构建任务中生成并校验',
    'SHA256SUMS.txt',
    'example/sms-center:1.2.3',
    'example/sms-center:latest',
    config.digest,
    '修改初始密码',
    '备份数据库',
    'compose.release.yaml',
    '修复上传问题',
    'blob/v1.2.3/README-SMS.md',
  ])
    assert.ok(text.includes(expected), expected);
  const pre = releaseNotes({ ...config, tag: 'v1.2.3-rc.1' });
  assert.ok(pre.includes('不更新 Docker latest'));
  assert.ok(!pre.includes('example/sms-center:latest'));
  assert.throws(() => releaseNotes({ ...config, digest: 'bad' }));
});

test('README screenshots are checked in and describe test data', () => {
  const home = fs.readFileSync('README.md', 'utf8');
  const guide = fs.readFileSync('README-SMS.md', 'utf8');
  for (const image of ['chrome-settings.png', 'chrome-popup.png']) {
    const target = path.join('docs', image);
    assert.ok(fs.statSync(target).size > 1024);
    assert.ok(home.includes(target));
    assert.ok(guide.includes(target));
  }
  assert.ok(guide.includes('截图使用自动化测试数据'));
});

test('APK packaging derives filename locally instead of using secret-filtered job outputs', async () => {
  const { readFileSync } = await import('node:fs');
  const { parse } = await import('yaml');
  const { spawnSync } = await import('node:child_process');
  const workflow = parse(readFileSync('.github/workflows/release.yml', 'utf8'));
  assert.equal(workflow.jobs.prepare.outputs.apkName, undefined);
  assert.equal(workflow.jobs.android.env.APK_NAME, undefined);
  const step = workflow.jobs.android.steps.find(
    (step) => step.name === 'Verify APK signature and package assets',
  );
  assert.ok(step.run.includes('APK_NAME="sms-center-v${SMS_RELEASE_VERSION}.apk"'));
  const setup = step.run.split('"$ANDROID_HOME/build-tools/')[0];
  const result = spawnSync('bash', ['-c', `${setup}\nprintf '%s' "$APK_NAME"`], {
    env: { SMS_RELEASE_VERSION: '1.0.0', PATH: process.env.PATH },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, releaseVersion('v1.0.0').apkName);
  const missing = spawnSync('bash', ['-c', setup], {
    env: { PATH: process.env.PATH },
    encoding: 'utf8',
  });
  assert.notEqual(missing.status, 0);
});

test('tag build produces installable Chrome ZIP without tests or credentials', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sms-center-extension-release-'));
  try {
    const output = path.join(temp, 'sms-center-chrome-v1.2.3-rc.1.zip');
    assert.equal(buildExtension('v1.2.3-rc.1', output), output);
    const files = execFileSync('unzip', ['-Z', '-1', output], { encoding: 'utf8' })
      .trim()
      .split('\n');
    assert.deepEqual(
      files.sort(),
      [
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
      ].sort(),
    );
    const manifest = JSON.parse(
      execFileSync('unzip', ['-p', output, 'manifest.json'], { encoding: 'utf8' }),
    );
    assert.equal(manifest.version, '1.2.3.401');
    assert.equal(manifest.version_name, '1.2.3-rc.1');
    assert.equal(manifest.manifest_version, 3);
    assert.throws(() => buildExtension('v1.2.3-rc.1', output), /产物已存在/);
    assert.throws(() => buildExtension('not-a-tag', path.join(temp, 'bad.zip')));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('release workflow builds plugin once and verifies artifact before uploading Release', () => {
  const workflow = parseYaml(fs.readFileSync('.github/workflows/release.yml', 'utf8'));
  assert.deepEqual(workflow.on.push.tags, ['v*']);
  assert.deepEqual(workflow.jobs.extension.needs, ['prepare', 'verify']);
  assert.ok(workflow.jobs.publish.needs.includes('extension'));
  assert.ok(
    workflow.jobs.extension.steps.some((step) =>
      step.run?.includes('scripts/package-extension.js'),
    ),
  );
  assert.ok(
    workflow.jobs.publish.steps.some(
      (step) =>
        step.uses?.startsWith('actions/download-artifact@') &&
        step.with?.name === 'chrome-extension-release-asset',
    ),
  );
  assert.ok(
    workflow.jobs.publish.steps.some((step) =>
      step.run?.includes('EXTENSION_SHA256SUMS.txt >> release-dist/SHA256SUMS.txt'),
    ),
  );
});
