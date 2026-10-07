<script setup>
import { computed, inject, onMounted, ref } from 'vue';
import { Plus, KeyRound, Copy, ShieldCheck, Ban, Terminal } from 'lucide-vue-next';
import { api, time, copyText } from '../api';
import Modal from '../components/Modal.vue';
const notify = inject('notify'),
  confirm = inject('confirm');
const tokens = ref([]),
  devices = ref([]),
  loading = ref(true),
  error = ref(''),
  form = ref(null),
  saving = ref(false),
  issued = ref(null);
const queryTokens = computed(() => tokens.value.filter((v) => v.kind === 'query'));
async function load() {
  loading.value = true;
  error.value = '';
  try {
    [tokens.value, devices.value] = await Promise.all([api('/tokens'), api('/devices')]);
  } catch (e) {
    error.value = e.message;
    notify(e.message, 'error');
  } finally {
    loading.value = false;
  }
}
onMounted(load);
defineExpose({ refresh: load });
function create() {
  form.value = { name: '', all: false, signatures: '', deviceIds: [], expiresAt: '' };
}
async function save() {
  const signatures = form.value.all
    ? ['*']
    : form.value.signatures
        .split(/[,，\n]/)
        .map((v) => v.trim())
        .filter(Boolean);
  if (!signatures.length) {
    notify('请填写至少一个短信签名', 'error');
    return;
  }
  saving.value = true;
  try {
    issued.value = await api('/tokens', {
      method: 'POST',
      body: {
        name: form.value.name,
        signatures,
        deviceIds: form.value.deviceIds,
        expiresAt: form.value.expiresAt ? new Date(form.value.expiresAt).getTime() : null,
      },
    });
    form.value = null;
    await load();
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    saving.value = false;
  }
}
async function revoke(token) {
  if (!(await confirm('撤销查询 Token', `「${token.name}」将立即失去所有查询权限。`))) return;
  try {
    await api(`/tokens/${token.id}`, { method: 'DELETE' });
    notify('Token 已撤销');
    await load();
  } catch (e) {
    notify(e.message, 'error');
  }
}
async function copy() {
  try {
    await copyText(issued.value.token);
    notify('查询 Token 已复制');
  } catch (e) {
    notify(e.message, 'error');
  }
}
const example = `curl -G '${window.location.origin}/api/v1/codes/latest' \\\n  -H 'Authorization: Bearer YOUR_QUERY_TOKEN' \\\n  --data-urlencode 'signature=示例服务'`;
function state(token) {
  return token.revokedAt
    ? '已撤销'
    : token.expiresAt && token.expiresAt <= Date.now()
      ? '已过期'
      : '有效';
}
</script>
<template>
  <div class="page-toolbar">
    <p>按短信签名与设备分配访问权限，完整 Token 只显示一次。</p>
    <button class="button primary" @click="create"><Plus :size="17" /> 分配查询 Token</button>
  </div>
  <div v-if="error" class="inline-error">{{ error }}</div>
  <section class="panel">
    <div v-if="loading" class="loading-panel">正在加载凭证…</div>
    <div v-else-if="!queryTokens.length" class="empty-state">
      <KeyRound :size="38" />
      <h3>还没有查询凭证</h3>
      <p>为调用方创建 Token，指定可查询的短信签名。</p>
      <button class="button primary" @click="create">分配查询 Token</button>
    </div>
    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>凭证名称</th>
            <th>Token 标识</th>
            <th>签名权限</th>
            <th>设备权限</th>
            <th>到期时间</th>
            <th>状态</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="token in queryTokens" :key="token.id">
            <td>
              <strong>{{ token.name }}</strong>
              <div class="small-text muted">最近使用：{{ time(token.lastUsedAt) }}</div>
            </td>
            <td class="mono small-text">{{ token.prefix }}…</td>
            <td>
              <div class="badge-list">
                <span v-for="signature in token.signatures" :key="signature" class="subtle-chip">{{
                  signature === '*' ? '全部签名' : signature
                }}</span>
              </div>
            </td>
            <td>{{ token.deviceIds.length ? `${token.deviceIds.length} 台设备` : '全部设备' }}</td>
            <td class="small-text muted">
              {{ token.expiresAt ? time(token.expiresAt) : '长期有效' }}
            </td>
            <td>
              <span class="status" :class="state(token) === '有效' ? 'green' : 'gray'">{{
                state(token)
              }}</span>
            </td>
            <td>
              <button
                v-if="!token.revokedAt"
                class="icon-button danger"
                aria-label="撤销 Token"
                title="撤销 Token"
                @click="revoke(token)"
              >
                <Ban :size="17" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  <section class="panel api-example">
    <div class="panel-heading">
      <div>
        <h3><Terminal :size="18" /> 获取最新验证码</h3>
        <p>签名需要精确匹配，默认只返回 10 分钟内的短信，有效期可在设置中修改。</p>
      </div>
      <span class="status blue">GET</span>
    </div>
    <pre>{{ example }}</pre>
    <p class="form-hint">
      上传 Token 在「设备管理」中创建或重置。查询失败和拒绝访问均会写入审计记录。
    </p>
  </section>
  <Modal v-if="form" title="分配查询 Token" @close="!saving && (form = null)"
    ><form @submit.prevent="save">
      <label class="field"
        >凭证名称<input
          v-model="form.name"
          required
          maxlength="64"
          placeholder="例如：自动化测试服务"
          autofocus /></label
      ><label class="field"
        >允许查询的短信签名<textarea
          v-model="form.signatures"
          :disabled="form.all"
          :required="!form.all"
          rows="2"
          placeholder="多个签名用逗号分隔，例如：支付宝, 示例服务"
        /></label
      ><label class="checkbox-field"
        ><input v-model="form.all" type="checkbox" /> 允许查询全部签名</label
      >
      <fieldset class="field">
        <legend>允许访问的设备</legend>
        <p class="form-hint">不选择表示全部设备。</p>
        <div class="checkbox-list">
          <label v-for="device in devices" :key="device.id" class="checkbox-field"
            ><input v-model="form.deviceIds" type="checkbox" :value="device.id" />{{
              device.name
            }}</label
          >
        </div>
      </fieldset>
      <label class="field"
        >到期时间（留空为长期有效）<input v-model="form.expiresAt" type="datetime-local"
      /></label>
      <div class="modal-actions">
        <button type="button" class="button secondary" :disabled="saving" @click="form = null">
          取消</button
        ><button class="button primary" :disabled="saving">
          {{ saving ? '生成中…' : '生成 Token' }}
        </button>
      </div>
    </form></Modal
  >
  <Modal v-if="issued" title="查询 Token 已生成" @close="issued = null"
    ><div class="success-notice">
      <ShieldCheck :size="22" /><span>已为「{{ issued.name }}」分配权限</span>
    </div>
    <p class="form-hint">请立即保存，关闭后无法再次查看完整 Token。</p>
    <label class="field"
      >查询 Token<textarea :value="issued.token" readonly class="mono" rows="3" /></label
    ><button class="button secondary full-width" @click="copy">
      <Copy :size="16" /> 复制查询 Token
    </button>
    <div class="modal-actions">
      <button class="button primary" @click="issued = null">已保存凭证</button>
    </div></Modal
  >
</template>
