<div align="center">

# 💬 SMS Center · 短信中枢

**一站式 Android 验证码采集、加密存储与查询平台**

![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A5%2022.12-339933?logo=nodedotjs&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)
![Android](https://img.shields.io/badge/Android-8.0%2B-3DDC84?logo=android&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)

[📖 完整使用指南](README-SMS.md) · [🔌 API 文档](docs/API.md) · [📦 APK 构建](https://github.com/MSamor/SMS-Center/actions/workflows/ci.yml) · [🐛 问题反馈](https://github.com/MSamor/SMS-Center/issues)

</div>

---

将手机收到的验证码集中到一个地方：Android App 负责采集和上传，Node 服务负责加密存储与授权查询，Vue 管理中心负责查看记录、管理设备和追踪接口访问。

**一次构建，一个服务。** Vue 页面打包至 `server/public/`，启动 Node 即可同时提供管理页面和全部 API。

## ✨ 核心功能

- 📱 **Android 采集**：短信接收、上传统计、权限引导、加密离线队列与失败重试。
- 🔐 **加密存储**：AES-256-GCM 加密短信内容，超级管理员首次登录强制修改密码。
- 🔑 **授权查询**：上传与查询 Token 独立，按短信签名和设备分配权限，获取最新有效验证码。
- 🖥️ **管理中心**：数据概览、短信分类筛选、设备管理、凭证分配和接口审计。
- ⚙️ **自动构建**：GitHub Actions 构建 APK，并检查 Node/Vue 测试与构建。

## 🚀 快速开始

需要 **Node.js ≥22.12.0**，建议使用 Node 24。

```bash
git clone https://github.com/MSamor/SMS-Center.git
cd SMS-Center
npm ci
cp server/.env.example server/.env
npm run build
npm start
```

浏览器访问 **http://localhost:3000**。Windows 用户可手动复制配置文件。

首次启动默认创建超级管理员 `admin`；初始密码留空时会随机生成并在终端显示一次。登录后必须修改密码，才能使用管理功能。

## 📱 连接手机

1. 在 [GitHub Actions](https://github.com/MSamor/SMS-Center/actions/workflows/ci.yml) 成功运行的 **Artifacts** 中下载并解压 Debug APK。
2. 在管理中心添加设备，保存生成的上传 Token。
3. 在 App 中填写手机可访问的服务地址和 Token，授权短信接收并开启采集。
4. 在管理中心分配查询 Token，通过 API 获取指定签名的验证码。

安装、后台运行设置和接口示例见 [完整使用指南](README-SMS.md)。当前 APK 为 Debug 签名，正式发布需配置自己的签名密钥。

## 📚 文档

| 文档                              | 内容                                                                      |
| --------------------------------- | ------------------------------------------------------------------------- |
| [📖 完整使用指南](README-SMS.md)  | 配置、初始改密、手机接入、开发构建、Actions、Docker/HTTPS、备份与常见问题 |
| [🔌 API 文档](docs/API.md)        | 短信上传、验证码查询、Token 权限、管理接口与错误码                        |
| [🧪 验证记录](docs/VALIDATION.md) | 已执行的检查、模拟器验证与当前边界                                        |

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request。提交前请运行 `npm run check`，并避免提交 `.env`、数据库、密钥或业务 Token。许可证状态见 [完整使用指南](README-SMS.md#项目结构与当前边界)。