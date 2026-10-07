# SMS Center 前端代码审查报告

## 审查概览

审查 admin/src 的 13 个 Vue/JS/CSS 文件，采用 fed-code-review 的 Detector Pass，低/中成本检测命中 329 条，已全部消费，未消费 0 条。项目没有 pre-commit hook。

## 规则命中问题

未发现需阻止交付的前端问题。已核对所有页面的请求错误提示、密码不持久化、Token 一次展示、明文查看审计、响应式布局与弹窗焦点恢复。

## L3 语义确认问题

当前环境未提供 skill 要求的 ace-tool 语义检索，未执行高成本 L3 检测，不宣称完成其全部协议。以本地源码阅读和真实浏览器测试补充检查：api.js 统一 URLSearchParams、错误解析、CSRF 和会话失效；App 清理事件与定时器，Messages 清理 AbortController；用户输入服务端统一 Zod 校验，Vue 默认文本转义，没有 v-html。

## Open questions

本仓库是独立产品，不依赖 @abc/ui-pc。技能中的 ABC 私有组件、布局与主题约束不用于替换本项目架构。技能包部分注册的规则卡缺失，记录见 frontend-review-hits.json；未请求用户补齐，继续用已可读规则与本地验证完成本任务。

## 修复计划

无需另行确认的前端修复。生产域名通过 ADMIN_ORIGINS 配置，当前测试仅使用临时数据库。

## 规则命中覆盖

| detector_id              | rule_id                                                                                                             | file:line                                   | 结论           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------- |
| element-ui-usage         | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:113            | false_positive |
| element-ui-usage         | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:172            | false_positive |
| element-ui-usage         | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:200            | false_positive |
| element-ui-usage         | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:79             | false_positive |
| element-ui-usage         | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:115            | false_positive |
| element-ui-usage         | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:143            | false_positive |
| element-ui-usage         | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:157              | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:191                       | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:207                       | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:232                       | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:241                       | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:255                       | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:269                       | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:275                       | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:276                       | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:193                       | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:216                       | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:234                       | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:257                       | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:271                       | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/InitialPassword.vue:89 | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/InitialPassword.vue:94 | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/InitialPassword.vue:91 | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/InitialPassword.vue:96 | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/Modal.vue:39           | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/Modal.vue:41           | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/Pagination.vue:17      | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/Pagination.vue:25      | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/Pagination.vue:32      | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:47               | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:86              | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:96              | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:120             | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:125             | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:158             | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:160             | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:173             | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:182             | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:88              | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:98              | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:127             | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:162             | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:175             | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:112            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:113            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:154            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:161            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:184            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:201            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:115            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:168            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:186            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:86             | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:205            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:213            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:207            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:215            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:111            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:138            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:148            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:176            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:188            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:216            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:153            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:190            | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:93               | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:102              | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:141              | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:204              | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:206              | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:219              | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:223              | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:149              | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:208              | false_positive |
| native-html-button       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:221              | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:176                       | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/App.vue:183                       | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/InitialPassword.vue:61 | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/InitialPassword.vue:70 | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/InitialPassword.vue:80 | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:40               | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:35               | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:42               | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:147             | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:154             | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Devices.vue:172             | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:93             | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:110            | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:111            | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:104            | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:87             | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:94             | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:101            | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:123            | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:130            | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:199            | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:201            | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:206            | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:210            | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:172              | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:187              | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:194              | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:201              | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:179              | false_positive |
| native-html-input        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:218              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:56               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:58               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:68               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:69               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:73               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:74               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:79               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:80               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:81               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:57               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:59               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:60               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:61               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:62               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:63               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Audits.vue:64               | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:132            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:134            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:144            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:145            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:148            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:149            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:150            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:151            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:152            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:133            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:135            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:136            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:137            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:138            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:139            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Messages.vue:140            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:218            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:220            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:228            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:229            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:232            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:233            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:234            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:219            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:221            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:222            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:223            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:224            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:159            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:161            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:170            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:171            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:172            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:173            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:174            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:175            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:160            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:162            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:163            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:164            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:165            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Settings.vue:166            | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:105              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:107              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:118              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:119              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:123              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:124              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:131              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:132              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:135              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:140              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:106              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:108              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:109              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:110              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:111              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:112              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:113              | false_positive |
| native-html-table        | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Tokens.vue:114              | false_positive |
| div-simulated-components | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/Modal.vue:26           | false_positive |
| div-simulated-components | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/components/Pagination.vue:14      | false_positive |
| wrong-icon-usage         | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/pages/Overview.vue:120            | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:119                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:151                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:156                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:191                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:206                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:269                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:306                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:348                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:414                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:470                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:483                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:489                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:502                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:534                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:613                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:660                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:671                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:680                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:713                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:730                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:739                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:762                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:793                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:799                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:822                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:875                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:887                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:900                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:911                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:917                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:938                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:967                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:979                     | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:1002                    | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:1024                    | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:1055                    | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:1077                    | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:1142                    | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:1151                    | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:1154                    | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:1171                    | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:1218                    | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:1253                    | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:1274                    | false_positive |
| abc-button-spacing       | RULE-UI-001, RULE-UI-002, RULE-UI-003, RULE-UI-004, RULE-UI-005, RULE-UI-006, RULE-UI-007, RULE-UI-008, RULE-UI-009 | admin/src/style.css:1297                    | false_positive |
| inline-style             | RULE-STYLE-001, RULE-STYLE-002, RULE-STYLE-003, RULE-STYLE-004, RULE-STYLE-005, RULE-STYLE-006, RULE-STYLE-007      | admin/src/pages/Overview.vue:193            | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/App.vue:26                        | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/App.vue:70                        | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/App.vue:73                        | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/App.vue:74                        | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/App.vue:111                       | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/api.js:2                          | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/api.js:9                          | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/api.js:14                         | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/api.js:17                         | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/api.js:24                         | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/api.js:33                         | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/api.js:39                         | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/api.js:43                         | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/api.js:49                         | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/components/InitialPassword.vue:5  | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/components/InitialPassword.vue:6  | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/components/InitialPassword.vue:7  | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/components/InitialPassword.vue:8  | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/components/InitialPassword.vue:9  | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/components/InitialPassword.vue:10 | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/components/Modal.vue:4            | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/components/Modal.vue:5            | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/components/Modal.vue:6            | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/components/Pagination.vue:4       | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/components/Pagination.vue:10      | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/components/Pagination.vue:11      | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Audits.vue:6                | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Audits.vue:10               | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Audits.vue:11               | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Devices.vue:14              | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Devices.vue:16              | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Devices.vue:39              | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Devices.vue:46              | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Devices.vue:67              | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Messages.vue:7              | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Messages.vue:9              | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Messages.vue:10             | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Messages.vue:21             | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Overview.vue:13             | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Overview.vue:15             | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Overview.vue:32             | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Overview.vue:34             | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Overview.vue:36             | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Overview.vue:43             | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Overview.vue:44             | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Overview.vue:47             | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Settings.vue:6              | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Settings.vue:12             | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Tokens.vue:6                | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Tokens.vue:8                | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Tokens.vue:15               | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Tokens.vue:34               | false_positive |
| naming-constant          | RULE-NAMING-001, RULE-NAMING-002, RULE-NAMING-003, RULE-NAMING-004                                                  | admin/src/pages/Tokens.vue:81               | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/App.vue:2                         | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/App.vue:3                         | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/App.vue:17                        | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/App.vue:18                        | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/App.vue:19                        | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/App.vue:20                        | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/App.vue:21                        | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/App.vue:22                        | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/App.vue:23                        | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/App.vue:24                        | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/App.vue:25                        | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/api.js:1                          | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/components/InitialPassword.vue:2  | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/components/InitialPassword.vue:3  | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/components/InitialPassword.vue:4  | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/components/Modal.vue:2            | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/components/Modal.vue:3            | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/components/Pagination.vue:2       | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/components/Pagination.vue:3       | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/main.js:1                         | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/main.js:2                         | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/main.js:3                         | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Audits.vue:2                | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Audits.vue:3                | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Audits.vue:4                | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Audits.vue:5                | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Devices.vue:2               | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Devices.vue:3               | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Devices.vue:12              | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Devices.vue:13              | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Messages.vue:2              | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Messages.vue:3              | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Messages.vue:4              | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Messages.vue:5              | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Messages.vue:6              | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Overview.vue:2              | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Overview.vue:3              | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Overview.vue:12             | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Settings.vue:2              | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Settings.vue:3              | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Settings.vue:4              | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Settings.vue:5              | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Tokens.vue:2                | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Tokens.vue:3                | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Tokens.vue:4                | false_positive |
| quality-commented-code   | RULE-QUALITY-001, RULE-QUALITY-002, RULE-QUALITY-003, RULE-QUALITY-004                                              | admin/src/pages/Tokens.vue:5                | false_positive |

## 未采纳命中说明

- **element-ui-usage**：按仓库上下文核对：ABC 特定样式/命名约束不适用，未发现影响行为或安全的缺陷。
- **native-html-button**：独立 Vue 3 项目，未接入 ABC 私有组件库；语义化原生按钮符合本项目选择。
- **native-html-input**：独立项目使用原生表单，label 关联、HTML 约束与服务端 Zod 校验均已核对。
- **native-html-table**：使用语义化原生表格，横向滚动支持窄屏；ABC 私有表格要求不适用于该项目。
- **div-simulated-components**：命中共享分页容器，不是将 div 伪装成交互控件，实际交互使用 button。
- **wrong-icon-usage**：SVG 为趋势数据图表，图标统一使用 lucide-vue-next，未另建图标系统。
- **abc-button-spacing**：项目无 abc-button；gap 用于独立页面布局。
- **inline-style**：动态计算签名占比宽度，符合规则中动态计算样式例外。
- **naming-constant**：命中为普通局部绑定、响应式变量和函数返回值，无须全部使用大写常量命名。
- **quality-commented-code**：按仓库上下文核对：ABC 特定样式/命名约束不适用，未发现影响行为或安全的缺陷。

## 通过检查的项目

- Vue 生产构建通过。
- Playwright 验证登录、设备创建、上传、短信明文查看、凭证生成、最新验证码查询、审计、设置、移动导航和刷新会话。
- 桌面与 390px 手机布局已截图核对，手机无页面横向溢出，浏览器未捕获页面异常。

## 总结

低/中成本 Detector Pass 已完成；高成本 L3 能力及缺失规则卡的限制已明确记录。结果用于此独立项目的实现检查，不等价于 ABC 团队完整审查认证。
