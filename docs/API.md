# API 使用说明

成功响应 `{ "data": ... }`；错误响应 `{ "error": { "code": "...", "message": "..." }, "requestId": "..." }`。时间均为 Unix 毫秒，签名精确匹配。管理页与 API 同源；外部接口不要求浏览器 Cookie。

## 手机上传

### GET /api/v1/device

`Authorization: Bearer <上传Token>`。验证凭证与设备状态，返回 `{ id, name, serverTime }`。

### POST /api/v1/sms

`Authorization: Bearer <上传Token>`，`Content-Type: application/json`。

```json
{
  "clientMessageId": "stable-client-message-id",
  "sender": "10690001",
  "body": "【示例服务】您的验证码是123456，5分钟内有效。",
  "receivedAt": 1791360000000
}
```

| 字段            | 约束                                                     |
| --------------- | -------------------------------------------------------- |
| clientMessageId | 1～128 字符，仅字母、数字及 `._:-`，同一设备重试必须相同 |
| sender          | 1～64 字符                                               |
| body            | 1～4096 字符，验证码关键词和格式须符合默认/签名识别规则  |
| receivedAt      | 整数毫秒，不早于短信保留期，不晚于当前服务时间 5 分钟    |

不接受客户端传入设备 ID、签名或验证码；设备由上传 Token 绑定，签名和验证码由服务端识别。签名提取 `【签名】` 或 `[签名]`，没有括号则使用发送号码。多段短信由 App 合并后上传。

新记录返回 HTTP 201，`{ id, signature, duplicate: false }`；相同设备和 clientMessageId 重试返回 HTTP 200，`{ id, duplicate: true }`。

## 最新验证码

### GET /api/v1/codes/latest

`Authorization: Bearer <查询Token>`。严禁把 Token 放在 URL 中。

| 查询参数      | 说明                                               |
| ------------- | -------------------------------------------------- |
| signature     | 必填，精确签名，1～64 字符                         |
| deviceId      | 可选，设备 UUID，必须属于 Token 的允许范围         |
| maxAgeSeconds | 可选，1～86400；只能缩短有效期，不能超过服务端设置 |

返回 `{ id, signature, code, sender, deviceId, receivedAt, expiresAt }`，不返回短信原文。最新按短信接收时间排序，同时间按上传时间排序；只返回已启用设备、允许范围内、未过期的短信。未来短信接收时间会暂时排除，避免提前查询到时钟偏移数据。

查询 Token 的 `signatures: ["*"]` 表示全部签名；必须单独指定通配符。`deviceIds: []` 表示全部设备。具体签名白名单和设备白名单同时生效。

## 错误

| HTTP | code                             | 说明                                       |
| ---- | -------------------------------- | ------------------------------------------ |
| 400  | INVALID_INPUT / BAD_REQUEST      | 参数或 JSON 有误                           |
| 401  | UNAUTHORIZED                     | Token 无效、撤销、过期或未提供             |
| 403  | TOKEN_SCOPE                      | 上传和查询 Token 使用错接口                |
| 403  | SIGNATURE_DENIED / DEVICE_DENIED | 超出签名或设备范围                         |
| 403  | DEVICE_DISABLED                  | 设备已停用                                 |
| 404  | CODE_NOT_FOUND                   | 允许范围内没有有效期内的验证码             |
| 413  | BAD_REQUEST                      | 超出 24KB 请求体上限                       |
| 422  | NO_CODE                          | 未识别到验证码，配置识别规则后用于后续短信 |
| 422  | INVALID_MESSAGE_TIME             | 短信时间超出允许范围                       |
| 429  | RATE_LIMITED / LOGIN_LIMITED     | 请求限流 / 登录失败过多                    |
| 500  | INTERNAL_ERROR                   | 服务内部错误                               |

默认每 IP 每分钟最多 300 次 API 请求，管理员登录失败每 IP 15 分钟最多 10 次。上传端对网络错误、401/403、429、5xx 保留加密任务并退避重试；400/413/422 作为永久拒绝。

## 管理 API

登录：`POST /api/admin/login`，body `{ username, password }`。返回 `{ username, role, mustChangePassword, csrfToken }` 和 HttpOnly `sms_session` Cookie。后续修改请求携带 `X-CSRF-Token`；浏览器 Origin 必须在配置白名单，Cookie 为 SameSite=Strict，生产环境要求 HTTPS Secure Cookie。

| 方法   | 路径（前缀 /api/admin）   | 用途 / 输入                                                                         |
| ------ | ------------------------- | ----------------------------------------------------------------------------------- |
| GET    | /me                       | 当前账号和 CSRF Token                                                               |
| POST   | /logout                   | 注销当前登录                                                                        |
| POST   | /password                 | `{ currentPassword, newPassword }`，新密码 12～256 字符，注销全部会话               |
| GET    | /overview                 | 总量、近 24 小时统计、UTC 日趋势、签名分布、最新记录                                |
| GET    | /signatures               | 已入库签名与数量                                                                    |
| GET    | /messages                 | `page,pageSize,signature,deviceId,from,to`；列表隐藏验证码                          |
| GET    | /messages/:id             | 解密短信详情，记录 admin.reveal 审计                                                |
| DELETE | /messages/:id             | 删除记录                                                                            |
| GET    | /devices                  | 设备、启用状态、最近上传、短信数量                                                  |
| POST   | /devices                  | `{ name }`，返回 `{ id, name, uploadToken }`，Token 仅此一次                        |
| PATCH  | /devices/:id              | `{ name, enabled }`                                                                 |
| POST   | /devices/:id/rotate-token | 撤销此设备旧上传凭证，返回新 uploadToken                                            |
| GET    | /tokens                   | 仅凭证元数据，无完整 Token 或 hash                                                  |
| POST   | /tokens                   | 创建查询 Token：`{ name, signatures, deviceIds?, expiresAt? }`，返回完整 token 一次 |
| DELETE | /tokens/:id               | 撤销上传或查询凭证                                                                  |
| GET    | /audits                   | `page,pageSize,action,signature,tokenId,status,from,to`                             |
| GET    | /rules                    | 签名识别规则                                                                        |
| PUT    | /rules                    | `{ signature, keyword, codeLength, alphabet }`                                      |
| DELETE | /rules/:signature         | 删除自定义识别规则                                                                  |
| GET    | /settings                 | `{ retentionDays, auditRetentionDays, codeMaxAgeSeconds }`                          |
| PUT    | /settings                 | 全量更新上述三个字段，立即清理超保留期数据                                          |

分页默认 page=1、pageSize=20，pageSize 最多 100；from/to 为时间戳。审计 action 筛选可选 query/upload/admin.reveal/admin.login（留空全部），status 为 success/failure（留空全部）。管理操作也写入审计；不记录请求 body、明文验证码或完整 Token。

识别规则 keyword 留空使用默认关键词，codeLength=0 自动匹配（数字 4～8、字母数字 4～10）；固定长度可为 4～10（数字最多 8），alphabet 为 digits/alphanumeric。规则只影响新上传，不重新解析旧数据。候选验证码须在关键词附近最多 32 字符范围内。

签名名、设备名、Token 名最大 64 字符；单个查询 Token 最多 100 个签名和设备。

## 初始超级管理员限制

首次初始化的账号角色为 `super_admin`，`mustChangePassword=true`。登录 Cookie 建立后，服务端检查数据库中的当前改密状态；仅允许 `/api/admin/me`、`/api/admin/password`、`/api/admin/logout`，其他管理接口返回 `403 PASSWORD_CHANGE_REQUIRED`。

`POST /api/admin/password` 仍需 Cookie、CSRF Token 和正确的当前密码。新密码 12～256 字符且不能与当前密码相同，否则返回 `400 PASSWORD_UNCHANGED`；修改成功将 `mustChangePassword` 清零，撤销所有旧会话，要求重新登录。`/me` 和 `/login` 都返回 `role` 与 `mustChangePassword`。此限制不依赖前端页面。

旧 v1 数据库会保留账号和密码，在启动时补充角色和初始改密状态。初始化环境变量只在无管理员时生效。
