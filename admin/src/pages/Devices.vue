<script setup>
import { inject, onMounted, ref } from 'vue';
import {
  Plus,
  Smartphone,
  Copy,
  RefreshCw,
  Pencil,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-vue-next';
import { api, time, copyText } from '../api';
import Modal from '../components/Modal.vue';
const notify = inject('notify'),
  confirm = inject('confirm');
const devices = ref([]),
  loading = ref(true),
  error = ref(''),
  saving = ref(false),
  form = ref(null),
  issued = ref(null);
async function load() {
  loading.value = true;
  error.value = '';
  try {
    devices.value = await api('/devices');
  } catch (e) {
    error.value = e.message;
    notify(e.message, 'error');
  } finally {
    loading.value = false;
  }
}
onMounted(load);
defineExpose({ refresh: load });
async function save() {
  saving.value = true;
  try {
    const current = form.value;
    if (current.id)
      await api(`/devices/${current.id}`, {
        method: 'PATCH',
        body: { name: current.name, enabled: current.enabled },
      });
    else {
      const result = await api('/devices', { method: 'POST', body: { name: current.name } });
      issued.value = { token: result.uploadToken, name: result.name };
    }
    form.value = null;
    notify('设备已保存');
    await load();
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    saving.value = false;
  }
}
async function rotate(device) {
  if (
    !(await confirm(
      '重置上传 Token',
      `设备「${device.name}」的原上传 Token 将立即失效。重置后需要在手机上更新配置。`,
    ))
  )
    return;
  try {
    const result = await api(`/devices/${device.id}/rotate-token`, { method: 'POST' });
    issued.value = { token: result.uploadToken, name: device.name };
    await load();
  } catch (e) {
    notify(e.message, 'error');
  }
}
async function copy() {
  try {
    await copyText(issued.value.token);
    notify('上传 Token 已复制');
  } catch (e) {
    notify(e.message, 'error');
  }
}
</script>
<template>
  <div class="page-toolbar">
    <p>每台手机拥有独立的上传凭证，方便追踪来源。</p>
    <button class="button primary" @click="form = { name: '', enabled: true }">
      <Plus :size="17" /> 添加设备
    </button>
  </div>
  <div v-if="error" class="inline-error">{{ error }}</div>
  <div v-if="loading" class="loading-panel">正在加载设备…</div>
  <div v-else-if="!devices.length" class="panel empty-state">
    <Smartphone :size="42" />
    <h3>连接你的第一台手机</h3>
    <p>创建设备后，将服务中心地址和上传 Token 填入 Android App。</p>
    <button class="button primary" @click="form = { name: '', enabled: true }">
      <Plus :size="16" /> 添加设备
    </button>
  </div>
  <div v-else class="device-grid">
    <article v-for="device in devices" :key="device.id" class="panel device-card">
      <div class="device-card-top">
        <span class="device-symbol"><Smartphone :size="25" /></span
        ><span class="status" :class="device.enabled ? 'green' : 'gray'"
          ><i></i>{{ device.enabled ? '已启用' : '已停用' }}</span
        >
      </div>
      <h3>{{ device.name }}</h3>
      <span class="device-id">{{ device.id }}</span>
      <div class="device-metrics">
        <div>
          <strong>{{ device.messageCount }}</strong
          ><span>已保存短信</span>
        </div>
        <div>
          <span>最近上传</span><b>{{ time(device.lastSeenAt) }}</b>
        </div>
      </div>
      <div class="device-actions">
        <button
          class="text-button"
          @click="form = { id: device.id, name: device.name, enabled: device.enabled }"
        >
          <Pencil :size="14" /> 编辑设备</button
        ><button class="text-button muted" @click="rotate(device)">
          <RefreshCw :size="14" /> 重置凭证
        </button>
      </div>
    </article>
  </div>
  <div class="info-box">
    <ShieldCheck :size="19" />
    <div>
      <strong>接入说明</strong>
      <p>
        上传 Token 只能上传短信；查询验证码需要单独分配查询
        Token。设备停用后，其上传接口与验证码查询都会被禁用。
      </p>
    </div>
  </div>
  <Modal
    v-if="form"
    :title="form.id ? '编辑设备' : '添加 Android 设备'"
    @close="!saving && (form = null)"
    ><form @submit.prevent="save">
      <label class="field"
        >设备名称<input
          v-model="form.name"
          required
          maxlength="64"
          autofocus
          placeholder="例如：测试手机 01" /></label
      ><label v-if="form.id" class="checkbox-field"
        ><input v-model="form.enabled" type="checkbox" /> 启用设备</label
      >
      <p class="form-hint">名称仅用于标记来源。上传 Token 会由服务中心生成。</p>
      <div class="modal-actions">
        <button type="button" class="button secondary" :disabled="saving" @click="form = null">
          取消</button
        ><button class="button primary" :disabled="saving">
          {{ saving ? '保存中…' : '保存设备' }}
        </button>
      </div>
    </form></Modal
  >
  <Modal v-if="issued" title="设备上传凭证已生成" @close="issued = null"
    ><div class="success-notice">
      <CheckCircle2 :size="22" /><span>{{ issued.name }}已准备就绪</span>
    </div>
    <p class="form-hint">Token 只显示这一次，请保存并填入 Android App 的设置页。</p>
    <label class="field"
      >上传 Token<textarea :value="issued.token" readonly rows="3" class="mono" /></label
    ><button class="button secondary full-width" @click="copy">
      <Copy :size="16" /> 复制上传 Token
    </button>
    <div class="info-box small">
      <span
        >服务中心地址请使用手机能够访问的局域网地址或 HTTPS 域名，不能填写电脑的 localhost。</span
      >
    </div>
    <div class="modal-actions">
      <button class="button primary" @click="issued = null">已保存凭证</button>
    </div></Modal
  >
</template>
