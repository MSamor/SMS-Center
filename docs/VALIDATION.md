# 验证记录

验证日期：2026-10-07。当前实现为可联调 MVP，未上线外部服务器。

| 验证                      | 结果                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Node 服务集成测试         | 16/16 通过，临时 SQLite 数据库                                                                                                           |
| Vue 生产构建              | 通过                                                                                                                                     |
| 浏览器联调                | 通过：首次登录强制改密、刷新仍受限、改密后重新登录、设备创建、上传、短信详情、查询 Token、最新验证码、审计、设置、移动导航、刷新恢复会话 |
| 390px 手机页面            | 无页面水平溢出，浏览器无 pageerror                                                                                                       |
| Android Debug 构建        | 通过，已生成 app-debug.apk                                                                                                               |
| Android Lint              | 0 errors，2 warnings（Gradle/WorkManager 更新提示）                                                                                      |
| Android API 35 模拟器     | 通过：真实 SMS 广播 → 加密本地队列 → HTTP 上传 → 限定签名/设备的最新验证码 API，App 展示已上传状态                                       |
| APK 签名校验              | 通过，Debug 签名                                                                                                                         |
| npm 依赖审计              | 0 vulnerabilities，已覆盖修复 shell-quote 依赖                                                                                           |
| Compose 配置校验          | 通过                                                                                                                                     |
| Docker 镜像构建和容器启动 | 未运行：本机 Docker daemon 没有启动                                                                                                      |
| 前端技能检查              | 已运行低/中成本 Detector Pass，详情见 frontend-review.md；部分技能规则卡/语义检索能力缺失，未宣称完整 ABC 审查                           |

## 模拟器验证复现

在独立终端启动测试服务：

```bash
node scripts/e2e-server.js
```

确保一次性模拟器已启动，APK 已构建：

```bash
ANDROID_HOME=/path/to/android/sdk ANDROID_SERIAL=emulator-5554 python3 scripts/android-smoke.py
```

脚本在临时服务创建仅用于测试的设备和凭证；安装 Debug APK、授予短信权限、通过 App 设置页保存连接、同意采集、模拟接收验证码，最后验证查询返回相同验证码。不会打印或写盘完整 Token；其设置写入 App 的加密存储。该脚本仅对一次性测试模拟器运行，不能用于用户真实手机。测试服务退出后删除临时数据库。

## 当前边界

- 未验证各品牌真机上的短信受限权限、自启动入口、省电限制、系统杀进程和长时间断网恢复。模拟器验证不代替这些真机测试。
- Debug APK 可安装联调；正式分发需要自有签名、应用图标/隐私声明审核与相应渠道要求。
- 默认规则不保证识别任意验证码格式；自定义签名规则只影响后续上传。
- App 不承诺后台实时上传；目前没有常驻前台服务、推送保活或上传通知。
- 数据库和密钥需一起备份，当前没有密钥轮换和自动备份工具。
- Docker 配置已静态校验，但镜像构建和 HTTPS 域名部署需要实际环境验证。

截图：`artifacts/admin-desktop.png`、`artifacts/admin-mobile.png`、`artifacts/android-statistics.png`。这些文件是本地生成产物，不入 Git。

## 开源构建与初始化验证

- 完整构建输出到 `server/public`，Node 从该目录同时提供页面与 API。
- 初始超级管理员无法访问管理数据，修改为不同密码后注销全部旧会话，重新登录才可使用。
- 重启保留账号和改密状态，初始环境变量不覆盖已存在的账号。
- v1 数据库迁移保留原密码，要求一次改密。
- GitHub Actions 配置提供 APK、Node/Vue 测试与静态资源产物；本地可验证 YAML 和构建，但远程工作流尚未在 GitHub 运行。
