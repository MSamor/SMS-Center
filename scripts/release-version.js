import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export function releaseVersion(tag) {
  const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(alpha|beta|rc)\.([1-9]\d*))?$/.exec(
    tag || '',
  );
  if (!match) throw new Error('版本标签必须为 v1.2.3 或 v1.2.3-alpha.1 / beta.1 / rc.1');
  const [, majorText, minorText, patchText, stage, sequenceText] = match;
  const [major, minor, patch] = [majorText, minorText, patchText].map(Number);
  const sequence = Number(sequenceText || 0);
  if (major > 199 || minor > 99 || patch > 99 || sequence > 199)
    throw new Error('版本范围：major 0..199、minor/patch 0..99、预发布序号 1..199');
  // Stable builds rank above pre-releases; retries of the same tag retain the same code.
  const rank = stage ? { alpha: 0, beta: 200, rc: 400 }[stage] + sequence : 999;
  return {
    tag,
    version: tag.slice(1),
    versionCode: major * 10000000 + minor * 100000 + patch * 1000 + rank,
    prerelease: !!stage,
    apkName: `sms-center-${tag}.apk`,
  };
}
export function validateImage(image) {
  if (!/^[a-z0-9][a-z0-9_-]*\/[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(image || ''))
    throw new Error(
      'DOCKERHUB_IMAGE 必须是小写 namespace/repository，不带 registry、标签或 digest',
    );
  return image;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const metadata = releaseVersion(process.env.RELEASE_TAG);
  validateImage(process.env.DOCKERHUB_IMAGE);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      Object.entries(metadata)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') + '\n',
    );
  }
  console.log(
    `发布 ${metadata.tag}，Android versionCode=${metadata.versionCode}，预发布=${metadata.prerelease}`,
  );
}
