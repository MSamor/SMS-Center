import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { releaseVersion, validateImage } from './release-version.js';

export function releaseNotes({ tag, image, digest, repository, sha, changes = '' }) {
  const info = releaseVersion(tag);
  validateImage(image);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid repository');
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid image digest');
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid commit');
  const base = `https://github.com/${repository}`;
  return `# 💬 SMS Center ${tag}

${info.prerelease ? '> 🧪 这是预发布版本，用于测试，不更新 Docker latest 标签。' : '> 📦 正式版本：Android APK 与 Vue + Node 一体化服务镜像。'}

## ✨ 本次更新

${changes.trim() || '本版本暂无自动生成的变更条目，请结合提交记录查看改动。'}

## 📱 APK 下载与安装

- 在本页 **Assets** 下载 **\`${info.apkName}\`**，不要下载源码压缩包作为安装包。
- 最低 Android 8.0 / API 26，APK 使用维护者配置的固定 Release 签名。
- APK 版本：\`${info.version}\`；versionCode：\`${info.versionCode}\`。
- 使用相同发布签名的旧版本可覆盖升级；原 Debug 版本可能需要先卸载，卸载会删除 App 本地配置与排队数据。
- 同时下载 \`SHA256SUMS.txt\`；Linux 可执行 \`sha256sum -c SHA256SUMS.txt\`，macOS 可执行 \`shasum -a 256 -c SHA256SUMS.txt\`。

## 🐳 Docker 镜像

镜像包含 Vue 管理页面和 Node 服务，只启动一个服务；支持 **linux/amd64、linux/arm64**。

\`\`\`bash
docker pull ${image}:${info.version}
\`\`\`

- 版本标签：\`${image}:${info.version}\`。
${info.prerelease ? '- 此预发布不更新 latest。' : `- latest：\`${image}:latest\`（最近一次成功发布的正式版本；生产环境建议固定版本）。`}
- 不可变引用：\`${image}@${digest}\`。

本页附件包含 **\`compose.release.yaml\`**。创建部署目录并将该文件保存为 \`compose.yaml\`，再创建 \`.env\`：

\`\`\`dotenv
SMS_CENTER_IMAGE=${image}:${info.version}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=
ADMIN_ORIGINS=https://sms.example.com
\`\`\`

把示例域名替换为自己的 HTTPS 管理域名，然后运行：

\`\`\`bash
docker compose up -d
docker compose logs sms-center
\`\`\`

Node 仅映射宿主机 \`127.0.0.1:3000\`，请配置 HTTPS 反向代理，参考 [Caddy 配置](${base}/blob/${tag}/deploy/Caddyfile.example)。数据和密钥保存在持久卷 \`sms-data\`；不要执行 \`docker compose down -v\` 删除业务数据。

## 🔐 首次使用

1. 初次启动自动创建超级管理员，默认用户名 \`admin\`；初始密码留空时随机生成，在服务日志显示一次。
2. 首次登录必须修改初始密码，再用新密码登录。
3. 在设备管理添加设备，在 Android App 填写服务地址和 \`upl_\` 上传 Token，授权短信权限并开启采集。
4. 在访问凭证分配 \`qry_\` 查询 Token，通过签名获取最新有效验证码。

## 🔄 升级与注意事项

- 升级前停服备份数据库和原始加密密钥；不要只拷贝运行中的 SQLite 主文件。
- 更新 \`SMS_CENTER_IMAGE\`，执行 \`docker compose pull && docker compose up -d\`，保留原有数据卷和密钥。
- 初始账号环境变量不会重置已有密码。早期数据库会保留数据并要求管理员完成一次改密。
- Android 后台与短信权限仍需在目标真机验证，上传不保证实时；特殊验证码格式可能需要自定义规则。

## 📖 文档与构建来源

- [完整使用指南](${base}/blob/${tag}/README-SMS.md)
- [API 文档](${base}/blob/${tag}/docs/API.md)
- [本版本提交](${base}/commit/${sha})

APK 校验文件与镜像 digest 用于核对下载的构建产物。此发布流程不代表新增功能已在所有手机型号验证。
`;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const changes = process.env.CHANGELOG_FILE
    ? JSON.parse(fs.readFileSync(process.env.CHANGELOG_FILE, 'utf8')).body
    : '';
  fs.writeFileSync(
    process.env.RELEASE_NOTES_FILE || 'release-notes.md',
    releaseNotes({
      tag: process.env.RELEASE_TAG,
      image: process.env.DOCKERHUB_IMAGE,
      digest: process.env.IMAGE_DIGEST,
      repository: process.env.GITHUB_REPOSITORY,
      sha: process.env.RELEASE_SHA,
      changes,
    }),
  );
}
