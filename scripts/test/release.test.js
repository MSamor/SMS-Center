import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseVersion, validateImage } from '../release-version.js';
import { releaseNotes } from '../release-notes.js';

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
