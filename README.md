# 短信中枢 · SMS Center

一个将 Android 手机、验证码存储和查询接口整合在一起的短信管理平台。

手机 App 接收验证码短信，通过独立的上传凭证发送到服务中心；服务中心加密存储短信，并通过受 Token 权限控制的 API 返回指定签名的最新验证码。Vue 管理页面随 Node 服务一起发布，部署时只需启动一个 Node 进程。

> 当前为可联调的第一版。仅对本人拥有或已获得授权的设备开启采集；手机 App 会明确申请短信权限与采集授权。

## 目录

- [功能与架构](#功能与架构)
- [快速开始：单服务运行](#快速开始单服务运行)
- [初始化超级管理员](#初始化超级管理员)
- [安装 APK 与连接手机](#安装-apk-与连接手机)
- [调用验证码查询 API](#调用验证码查询-api)
- [配置说明](#配置说明)
- [开发、构建与测试](#开发构建与测试)
- [GitHub Actions 自动构建](#github-actions-自动构建)
- [Docker 与 HTTPS 部署](#docker-与-https-部署)
- [数据备份与升级](#数据备份与升级)
- [常见问题](#常见问题)
- [项目结构与当前边界](#项目结构与当前边界)

## 功能与架构

| 项目         | 技术                                    | 功能                                                                                          |
| ------------ | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| Android App  | Kotlin / Android Keystore / WorkManager | 新短信接收、统计、服务连接配置、权限引导、加密离线队列、退避重试、手动导入历史验证码          |
| 短信服务中心 | Node.js / Express / SQLite              | 加密短信存储、签名识别、设备绑定上传 Token、签名/设备范围查询 Token、最新有效验证码查询、审计 |
| 管理页面     | Vue 3 / Vite                            | 概览、短信筛选与详情、设备管理、凭证分配/撤销、接口审计、识别规则、保留策略、密码管理         |

```mermaid
flowchart LR
    Phone[Android 手机] -->|上传 Token / HTTP API| Node[Node 服务中心]
    Caller[验证码调用方] -->|查询 Token / 指定签名| Node
    Browser[管理浏览器] -->|同一地址 / 页面与管理 API| Node
    Node --> Public[server/public / Vue 构建产物]
    Node --> DB[(SQLite / 加密短信)]
```

安全机制：

- 短信正文、验证码和发送号码使用 AES-256-GCM 加密；短信签名、设备、时间等索引元数据明文保存。
- 上传 Token 绑定单台设备；查询 Token 可限制签名和设备范围，支持过期与撤销，数据库只保存 Token 摘要。
- 超级管理员首次登录必须改密；管理会话使用 HttpOnly Cookie、CSRF 与来源校验，密码使用 scrypt。
- 短信列表默认隐藏验证码，查看明文会写入审计；审计不保存验证码、正文或完整 Token。
- 查询只返回允许范围内、有效期内、已启用设备的验证码。

## 快速开始：单服务运行

### 1. 环境要求

- Node.js **>=22.12.0**，建议使用 **Node 24**；仓库提供 `.nvmrc`。
- npm，依赖安装使用仓库根目录的 `package-lock.json`。
- 构建或运行服务不需要安装 Android SDK。

如果安装了 nvm：

```bash
nvm install
nvm use
```

### 2. 下载源码并安装依赖

克隆仓库并进入项目根目录（使用自己的 Fork 时替换仓库地址）：

```bash
git clone https://github.com/MSamor/SMS-Center.git
cd SMS-Center
npm ci
cp server/.env.example server/.env
```

Windows 可手动复制 `server/.env.example` 为 `server/.env`。

### 3. 构建管理页面

```bash
npm run build
```

构建脚本 `scripts/build.js` 执行两步：

1. 使用 Vite 打包 Vue，输出到 `admin/dist/`。
2. 把成功构建的产物复制到 `server/public/`，替换之前的静态页面。

构建失败不会删除原来的静态页面。`server/public/` 为生成目录，不提交到 Git；修改前端后需重新构建。

### 4. 启动唯一的服务

```bash
npm start
```

也可直接运行：

```bash
node server/src/index.js
```

浏览器打开 **http://localhost:3000**。管理页面、管理 API、手机上传 API 和验证码查询 API 都由同一 Node 服务提供，运行时不需要 Vite。

健康检查：

```bash
curl http://localhost:3000/api/health
```

默认数据目录为 `server/data/`。启动会自动创建 SQLite 数据库和加密密钥。首次启动的账号初始化方式见下一节。

## 初始化超级管理员

数据库中没有管理员时，服务自动初始化一个 `super_admin` 账号：

| 配置                  | 默认行为                                       |
| --------------------- | ---------------------------------------------- |
| `ADMIN_USERNAME`      | `admin`                                        |
| `ADMIN_PASSWORD` 留空 | 生成随机初始密码，仅在首次初始化的终端输出一次 |
| `ADMIN_PASSWORD` 有值 | 使用配置的初始密码，要求 12～256 个字符        |

可在首次启动前编辑 `server/.env`：

```dotenv
ADMIN_USERNAME=admin
ADMIN_PASSWORD=自行填写至少12字符的初始密码
```

初次使用流程：

1. 使用初始账号和密码登录管理页面。
2. 系统强制显示改密页面，输入初始密码、新密码和确认密码。
3. 新密码必须为 12～256 字符，且不能与初始密码相同。
4. 修改成功后全部旧登录会话失效，使用新密码重新登录，才能访问管理功能。

**此限制由后端强制执行。** 未改密的登录会话只能访问 `/me`、`/password`、`/logout`；访问短信、设备、凭证、审计、设置等接口会返回 `403 PASSWORD_CHANGE_REQUIRED`。刷新页面或直接访问 URL 不会绕过限制。

`ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 只用于创建初始账号，修改环境变量或重启不会覆盖已有账号和密码。完成初始化后可从部署配置中移除初始密码。

从早期数据库版本升级时，已有账号、密码和短信保留；管理员自动补充 `super_admin` 角色，并要求完成一次密码修改。之后不会在每次启动时重复要求首次改密。

## 安装 APK 与连接手机

### 获取 APK

可以在自己的 GitHub 仓库 **Actions → Build and Test → 已成功运行的工作流 → Artifacts** 中下载 `sms-center-android-debug-<运行编号>`，解压后安装 `app-debug.apk`。自动构建说明见 [GitHub Actions](#github-actions-自动构建)。

也可以自行构建。需要 JDK 17（或兼容的 JDK 21）、Android SDK、Platform 35 和 Build Tools 35.0.0：

```bash
cd android
# 配置 ANDROID_HOME，或用 Android Studio 打开 android 目录
./gradlew :app:assembleDebug :app:lintDebug
```

Windows 使用 `gradlew.bat`。产物路径：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

ADB 安装到测试设备：

```bash
adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk
```

APK 最低支持 Android 8.0（API 26）。当前自动构建为 Debug 签名，用于测试和内部联调；CI 不依赖签名 Secrets。正式发布需要维护者自己的持久签名密钥。不同 CI 运行的临时 Debug 密钥可能不同，覆盖安装出现签名不一致时，需要卸载旧测试版本；卸载会移除 App 本地配置与队列。

### 接入步骤

1. 在网页「设备管理」点击「添加设备」，填写名称。
2. 保存只显示一次的 `upl_` 上传 Token。
3. 打开手机 App 的「连接与设置」，填写 **服务根地址** 和上传 Token。
4. 保存并点击「验证服务与设备」。
5. 开启验证码采集，同意说明并授予短信接收权限。
6. 根据手机厂商设置后台运行、自启动与电池限制。
7. 收到验证码短信后，在 App 统计页检查上传状态，在网页「短信记录」查看入库结果。

地址示例：

| 场景                        | 服务地址                                                          |
| --------------------------- | ----------------------------------------------------------------- |
| 同一局域网的真实手机        | `http://192.168.1.10:3000`，替换为服务电脑的局域网 IP             |
| Android 模拟器访问宿主机    | `http://10.0.2.2:3000`                                            |
| 模拟器使用 ADB 端口反向代理 | 执行 `adb reverse tcp:3000 tcp:3000` 后填 `http://127.0.0.1:3000` |
| 公网部署                    | `https://sms.example.com`，替换为自己的域名                       |

地址不包含 `/api`，真实手机不能填写电脑的 `localhost`。确保手机能访问该地址、服务监听对应网卡且防火墙放行端口。公网部署使用 HTTPS。

默认只处理开启采集后的新短信。需要历史短信时，手动点击「导入最近 24 小时验证码」，单独授权 READ_SMS；最多扫描最近 500 条短信。普通短信不作为验证码存储。

App 先按关键词筛选候选，服务端最终提取验证码。默认支持关键词附近的 4～8 位数字；特殊格式可以在网页配置签名规则，在 App 配置额外采集关键词。自定义规则可支持 4～10 位字母数字（至少含一位数字），仅影响之后上传的短信。

## 调用验证码查询 API

### 创建查询凭证

在网页「访问凭证」创建查询 Token：

- 指定允许查询的短信签名，例如 `示例服务`。
- 可限制设备范围；不选择设备表示全部设备。
- 可指定到期时间。
- 完整 `qry_` Token 只显示一次，关闭后无法再次查看。

上传 Token 和查询 Token 不能混用。签名精确匹配，不包含 `【】`：`【示例服务】验证码…` 对应 `signature=示例服务`。

### 获取最新验证码

```bash
curl -G 'http://localhost:3000/api/v1/codes/latest' \
  -H 'Authorization: Bearer YOUR_QUERY_TOKEN' \
  --data-urlencode 'signature=示例服务'
```

成功响应：

```json
{
  "data": {
    "id": "消息UUID",
    "signature": "示例服务",
    "code": "123456",
    "sender": "10690001",
    "deviceId": "设备UUID",
    "receivedAt": 1791360000000,
    "expiresAt": 1791360600000
  }
}
```

可选参数 `deviceId` 限制来源设备，`maxAgeSeconds` 缩短查询有效期。默认有效期 600 秒；调用方不能通过参数扩大服务端的有效期设置。“最新”按短信接收时间排序，上传时间用于同时间排序。

### 上传接口

```bash
curl -X POST 'http://localhost:3000/api/v1/sms' \
  -H 'Authorization: Bearer YOUR_UPLOAD_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"clientMessageId":"test-message-001","sender":"10690001","body":"【示例服务】验证码123456","receivedAt":1791360000000}'
```

手动测试时请把 `receivedAt` 替换为当前 Unix 毫秒时间。设备由 Token 绑定，签名和验证码由服务端提取；相同设备和 `clientMessageId` 重试不会重复入库。

| 状态                       | 常见原因                                |
| -------------------------- | --------------------------------------- |
| `401`                      | 未提供 Token、Token 无效、已过期或撤销  |
| `403`                      | Token 类型错误、签名/设备越权或设备停用 |
| `404 CODE_NOT_FOUND`       | 允许范围内没有有效期内的验证码          |
| `422 NO_CODE`              | 未识别到验证码，检查短信格式与识别规则  |
| `422 INVALID_MESSAGE_TIME` | 短信时间超出允许范围，检查设备时钟      |
| `429`                      | 请求超过限流                            |

完整字段、管理 API 和错误码见 [docs/API.md](docs/API.md)。Token 通过 Authorization 传递，不写入 URL。

## 配置说明

服务端自动读取 **`server/.env`**；外部环境变量优先。Compose 读取根目录 **`.env`** 作为变量替换，两者用途不同。

| 变量             | 默认值                                   | 说明                                                                             |
| ---------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| `PORT`           | `3000`                                   | 页面和 API 的唯一监听端口                                                        |
| `HOST`           | `0.0.0.0`                                | 监听地址                                                                         |
| `NODE_ENV`       | 未设置时按开发模式                       | 生产部署设置 `production`                                                        |
| `DATA_DIR`       | `./data`                                 | 相对于 server 目录，也支持绝对路径                                               |
| `ADMIN_USERNAME` | `admin`                                  | 仅首次初始化超级管理员使用                                                       |
| `ADMIN_PASSWORD` | 留空                                     | 留空生成随机初始密码；有值需 12～256 字符；必须在首次登录修改                    |
| `ENCRYPTION_KEY` | 自动生成文件                             | 可选，32 字节 Base64 密钥；不可替换已有数据使用的密钥                            |
| `ADMIN_ORIGINS`  | 本机 3000/5173 的 localhost 与 127.0.0.1 | 逗号分隔的浏览器 Origin，包含协议、主机、端口；生产环境必须显式配置 HTTPS Origin |
| `TRUST_PROXY`    | `0`                                      | 仅单层可信反向代理环境设置 `1`                                                   |
| `SESSION_HOURS`  | `12`                                     | 管理登录有效小时数，范围 1～168                                                  |

用局域网 IP 访问管理页时，需要把其浏览器 Origin 加入白名单，例如：

```dotenv
ADMIN_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.10:3000
```

管理页面「系统设置」可修改短信保留天数、审计保留天数和验证码查询有效期。默认分别为 30 天、90 天、600 秒；缩短保留期会立即清理超期数据。

## 开发、构建与测试

```bash
npm ci
npm run dev
```

开发模式为了热更新启动两个进程：Node 在 3000，Vite 在 5173，管理页面使用 `http://localhost:5173`。**这是开发模式；构建后的部署只运行 Node。**

| 命令                   | 用途                                           |
| ---------------------- | ---------------------------------------------- |
| `npm run build`        | Vue 构建并复制到 server/public                 |
| `npm run build:admin`  | 仅构建 Vue 到 admin/dist，不更新 Node 静态目录 |
| `npm start`            | 单 Node 服务，提供页面与 API                   |
| `npm run dev`          | 本地 Node/Vue 热更新                           |
| `npm test`             | 服务端集成测试、初始改密与数据库迁移测试       |
| `npm run test:e2e`     | 构建单服务产物，运行浏览器全链路测试           |
| `npm run check`        | 服务端测试和完整构建                           |
| `npm run format:check` | 检查源码与工作流格式                           |

浏览器测试在 macOS 优先使用已安装的 Google Chrome；其他环境先安装 Playwright Chromium：

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

测试使用独立临时 SQLite，不操作正式数据；其中固定密码只用于测试服务。浏览器测试覆盖首次登录强制改密、刷新仍被限制、改密重新登录、设备创建、短信上传、凭证生成、查询、审计和手机布局。

Android 构建检查：

```bash
cd android
./gradlew :app:assembleDebug :app:lintDebug
```

模拟器短信链路复现步骤和验证边界见 [docs/VALIDATION.md](docs/VALIDATION.md)。

## GitHub Actions 自动构建

仓库已经提供 [.github/workflows/ci.yml](.github/workflows/ci.yml)，推送到 GitHub 后可使用；本地创建配置不会自动触发远程运行。

触发方式：

- `push`：分支或标签推送。
- `pull_request`：合并请求验证。
- `workflow_dispatch`：在 Actions 页手动点击 Run workflow。

两个独立任务：

| 任务         | 步骤                                                             | 产物                                     |
| ------------ | ---------------------------------------------------------------- | ---------------------------------------- |
| Android APK  | JDK 17、Android SDK 35、Gradle Wrapper、assembleDebug、lintDebug | Debug APK、Lint 报告                     |
| Node and Vue | Node 24、npm ci、格式检查、API 测试、Vue 构建、浏览器测试        | server/public 静态页面，失败时浏览器报告 |

第三方 Actions 固定到 commit SHA；工作流只授予 `contents: read`，不需要 APK 签名 Secrets，也不需要真实管理员、服务端密钥或业务 Token。依赖使用公开 npm 仓库。

下载 APK：

1. 打开仓库的 Actions。
2. 选择成功完成的 Build and Test 运行。
3. 在 Artifacts 下载 `sms-center-android-debug-<运行编号>`。
4. 解压取得 `app-debug.apk`。

产物默认保留 14 天。工作流目前不自动创建 GitHub Release，不构建正式签名 APK；下载的静态页面产物也不包含 Node 依赖和数据库，不能单独作为完整后端部署包。

## Docker 与 HTTPS 部署

镜像使用相同构建脚本，Vue 产物放入 `server/public`，运行层只启动 Node。

在项目根目录创建 `.env`：

```dotenv
ADMIN_USERNAME=admin
# 可留空：首启随机生成并从容器日志获取；也可填写12～256字符的初始密码
ADMIN_PASSWORD=
ADMIN_ORIGINS=https://sms.example.com
```

将域名替换为自己的域名，随后：

```bash
docker compose up -d --build
docker compose logs sms-center
```

首次登录后仍必须修改初始密码。容器使用持久卷 `sms-data`，数据库和密钥在 `/app/server/data/`。

Compose 将 Node 绑定到宿主机 **`127.0.0.1:3000`**，配置 HTTPS 反向代理后再对外提供访问。可参考 [deploy/Caddyfile.example](deploy/Caddyfile.example)：

```caddyfile
sms.example.com {
    reverse_proxy 127.0.0.1:3000
    header {
        -Server
    }
}
```

示例适用于 Caddy 在宿主机运行的情况；如 Caddy 在其他容器中运行，需调整端口、网络与上游地址。`TRUST_PROXY=1` 仅用于单层可信代理，不能在 Node 端口向不可信客户端开放时随意启用。

也可以直接安装 Node 部署：

```bash
npm ci
npm run build
# 在 server/.env 设置生产环境、HTTPS Origin 等配置
npm start
```

生产环境会使用 Secure 管理 Cookie，需通过 HTTPS 域名登录。部署时由进程管理器或容器重启策略维持 Node 服务。

## 数据备份与升级

- 默认数据为 `server/data/sms-center.sqlite`，密钥为 `server/data/encryption.key`。
- **数据库和原始密钥必须一起备份。** 设置 `ENCRYPTION_KEY` 时也须保存原始环境密钥。
- 推荐停服后备份整个数据目录/持久卷；不要只拷贝运行中的 SQLite 主文件，WAL 可能尚未合并。
- 恢复时使用原始密钥。密钥缺失或不匹配时服务拒绝打开数据，不会重新生成密钥覆盖已有数据。
- 升级前先备份，更新源码、安装依赖、执行 `npm run build`，然后重启 Node。
- 数据结构升级在启动时迁移；初始账号环境变量不会覆盖已有账号。
- 忘记密码时，修改 `ADMIN_PASSWORD` 不会重置账号。当前没有自助找回/重置 CLI；请保留可用管理员凭证，不要删除数据库来尝试修复密码。

App 的加密队列最多保留 30 天，上传成功后移除本地原文。关闭采集会取消后台上传，已排队数据仍加密保留，重新开启后继续处理；卸载会移除 App 的本地配置与数据。

## 常见问题

### 启动 Node 后提示页面尚未构建

在仓库根目录执行 `npm run build`，确认 `server/public/index.html` 存在，再重启 Node。仅执行 `npm run build:admin` 不会更新 Node 静态目录。

### Node 18 安装失败

项目需要 Node >=22.12.0，建议切换到 `.nvmrc` 指定的 Node 24 后重新执行 `npm ci`。

### 登录成功却无法访问管理接口

如果返回 `PASSWORD_CHANGE_REQUIRED`，先完成初始改密。如果返回 `ORIGIN_DENIED`，检查浏览器访问地址是否在 `ADMIN_ORIGINS` 中；修改配置后重启服务。

### 手机无法连接服务

确认使用手机能访问的 IP/域名、地址不带 `/api`、服务监听与防火墙配置正确。公网证书必须有效。App 的「验证服务与设备」可以区分凭证拒绝和网络访问失败。

### 手机能收到短信，但 App 没有记录

检查采集开关、短信接收权限以及短信是否包含验证码关键词。侧载短信权限可能受安装器和系统限制；先用授权的测试设备验证。App 不是通知监听器，不读取聊天软件通知中的验证码。

### 待上传记录一直未上传

查看错误提示、Token 是否被撤销、设备是否停用以及服务可达性。网络/服务故障会退避重试；配置修正后点击「立即尝试上传」。App 会直接尝试访问配置的服务地址，支持无法连接公网的局域网场景。

### 查询返回 404，但管理页能看到短信

检查短信是否超过查询有效期、设备是否停用，以及 Token 的设备范围。管理列表保留期与验证码查询有效期不同，历史记录不保证仍可通过查询接口返回。

### 后台短信或上传不及时

Android 和厂商省电策略会影响调度。允许自启动、后台运行并根据厂商要求锁定最近任务。系统强行停止 App 后需手动重新打开；不能保证实时上传。

## 项目结构与当前边界

```text
SMS-Center/
├── .github/workflows/ci.yml    # APK 与 Node/Vue CI
├── android/                   # 原生 Android App 与 Gradle Wrapper
├── admin/                     # Vue 源码；dist 为构建输出
├── server/
│   ├── src/                   # Node API、加密、数据库与初始化
│   ├── test/                  # API、安全、初始化与迁移测试
│   ├── public/                # 构建脚本生成，Node 直接托管
│   ├── data/                  # 数据库和密钥，不提交 Git
│   └── .env.example           # 服务配置示例
├── scripts/build.js           # Vue 构建 → Node 静态目录
├── e2e/                       # 浏览器联调
├── docs/                      # API 与验证记录
├── Dockerfile
└── compose.yaml
```

当前未实现：管理员多角色分配、密码找回、密钥轮换、自动备份、分布式多实例、APK 自动更新、正式签名发布和应用商店审核。Android 13+ 侧载权限、各厂商自启动入口和长时间后台行为仍需目标真机验证。

贡献时请避免提交 `.env`、数据文件、密钥、签名文件和业务 Token；提交变更前运行 `npm run check` 与相关联调。开源许可证由维护者在仓库的 `LICENSE` 中声明；当前代码尚未附加许可证文件。
