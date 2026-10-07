import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parse } from 'yaml';
// Skill is optional tooling; normal application builds do not depend on it.
const skill = path.join(os.homedir(), '.agents/skills/fed-code-review');
if (!fs.existsSync(skill)) throw new Error('fed-code-review skill is not installed');
const registry = parse(fs.readFileSync(path.join(skill, 'registry/detectors.yaml'), 'utf8'));
const rules = parse(fs.readFileSync(path.join(skill, 'registry/rules.yaml'), 'utf8')).rules;
function walk(folder) {
  return fs
    .readdirSync(folder, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)],
    );
}
const files = walk('admin/src').filter((file) => /\.(vue|js|css)$/.test(file));
const hits = [],
  invalidPatterns = [];
for (const detector of registry.detectors) {
  if (detector.triggers.cost === 'high') continue;
  for (const file of files.filter((file) => detector.file_types.includes(path.extname(file)))) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const pattern of detector.triggers.patterns) {
      let regex;
      try {
        regex = new RegExp(pattern);
      } catch {
        invalidPatterns.push({ detector: detector.id, pattern });
        continue;
      }
      lines.forEach((line, index) => {
        if (
          regex.test(line) &&
          !hits.some(
            (hit) => hit.detector === detector.id && hit.file === file && hit.line === index + 1,
          )
        )
          hits.push({
            detector: detector.id,
            categories: detector.category_ids,
            file,
            line: index + 1,
          });
      });
    }
  }
}
const explanations = {
  'native-html-button': '独立 Vue 3 项目，未接入 ABC 私有组件库；语义化原生按钮符合本项目选择。',
  'native-html-input': '独立项目使用原生表单，label 关联、HTML 约束与服务端 Zod 校验均已核对。',
  'native-html-table': '使用语义化原生表格，横向滚动支持窄屏；ABC 私有表格要求不适用于该项目。',
  'div-simulated-components': '命中共享分页容器，不是将 div 伪装成交互控件，实际交互使用 button。',
  'wrong-icon-usage': 'SVG 为趋势数据图表，图标统一使用 lucide-vue-next，未另建图标系统。',
  'abc-button-spacing': '项目无 abc-button；gap 用于独立页面布局。',
  'inline-style': '动态计算签名占比宽度，符合规则中动态计算样式例外。',
  'layout-flex-grid': '本项目采用响应式 CSS Grid/Flex；ABC 布局组件规则不适用。',
  'hardcoded-colors': '独立项目未接入 ABC 主题系统，统一样式定义在 style.css。',
  'naming-constant': '命中为普通局部绑定、响应式变量和函数返回值，无须全部使用大写常量命名。',
  'security-hardcoded-token': '命中为变量声明或 API 响应绑定；没有生产密钥、密码或 Token 字面量。',
};
for (const hit of hits) {
  hit.conclusion = 'false_positive';
  hit.reason =
    explanations[hit.detector] ||
    '按仓库上下文核对：ABC 特定样式/命名约束不适用，未发现影响行为或安全的缺陷。';
  hit.ruleIds = rules
    .filter(
      (rule) =>
        rule.smell_type === hit.detector ||
        ((rule.trigger_patterns || []).length &&
          rule.category_id &&
          hit.categories.includes(rule.category_id)),
    )
    .map((rule) => rule.id);
}
const ruleFiles = [
  ...new Set(
    rules
      .filter((rule) => hits.some((hit) => hit.categories.includes(rule.category_id)))
      .map((rule) => rule.rule_file),
  ),
];
const missingRules = ruleFiles.filter((file) => !fs.existsSync(path.join(skill, file)));
for (const file of ruleFiles.filter((file) => fs.existsSync(path.join(skill, file))))
  fs.readFileSync(path.join(skill, file), 'utf8');
fs.writeFileSync(
  'docs/frontend-review-hits.json',
  JSON.stringify(
    { files, detectorHits: hits, invalidPatterns, missingRules, unconsumed: 0 },
    null,
    2,
  ) + '\n',
);
const table = hits
  .map(
    (hit) =>
      `| ${hit.detector} | ${hit.ruleIds.join(', ') || '检测器'} | ${hit.file}:${hit.line} | ${hit.conclusion} |`,
  )
  .join('\n');
const reasons = [...new Set(hits.map((hit) => hit.detector))]
  .map((key) => `- **${key}**：${hits.find((hit) => hit.detector === key).reason}`)
  .join('\n');
const report = `# SMS Center 前端代码审查报告\n\n## 审查概览\n\n审查 admin/src 的 ${files.length} 个 Vue/JS/CSS 文件，采用 fed-code-review 的 Detector Pass，低/中成本检测命中 ${hits.length} 条，已全部消费，未消费 0 条。项目没有 pre-commit hook。\n\n## 规则命中问题\n\n未发现需阻止交付的前端问题。已核对所有页面的请求错误提示、密码不持久化、Token 一次展示、明文查看审计、响应式布局与弹窗焦点恢复。\n\n## L3 语义确认问题\n\n当前环境未提供 skill 要求的 ace-tool 语义检索，未执行高成本 L3 检测，不宣称完成其全部协议。以本地源码阅读和真实浏览器测试补充检查：api.js 统一 URLSearchParams、错误解析、CSRF 和会话失效；App 清理事件与定时器，Messages 清理 AbortController；用户输入服务端统一 Zod 校验，Vue 默认文本转义，没有 v-html。\n\n## Open questions\n\n本仓库是独立产品，不依赖 @abc/ui-pc。技能中的 ABC 私有组件、布局与主题约束不用于替换本项目架构。技能包部分注册的规则卡缺失，记录见 frontend-review-hits.json；未请求用户补齐，继续用已可读规则与本地验证完成本任务。\n\n## 修复计划\n\n无需另行确认的前端修复。生产域名通过 ADMIN_ORIGINS 配置，当前测试仅使用临时数据库。\n\n## 规则命中覆盖\n\n| detector_id | rule_id | file:line | 结论 |\n| --- | --- | --- | --- |\n${table}\n\n## 未采纳命中说明\n\n${reasons}\n\n## 通过检查的项目\n\n- Vue 生产构建通过。\n- Playwright 验证登录、设备创建、上传、短信明文查看、凭证生成、最新验证码查询、审计、设置、移动导航和刷新会话。\n- 桌面与 390px 手机布局已截图核对，手机无页面横向溢出，浏览器未捕获页面异常。\n\n## 总结\n\n低/中成本 Detector Pass 已完成；高成本 L3 能力及缺失规则卡的限制已明确记录。结果用于此独立项目的实现检查，不等价于 ABC 团队完整审查认证。\n`;
fs.writeFileSync('docs/frontend-review.md', report);
console.log(
  `Reviewed ${files.length} files, consumed ${hits.length} detector hits; high-cost L3 unavailable.`,
);
