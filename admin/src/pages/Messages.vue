<script setup>
import { inject, onMounted, onBeforeUnmount, reactive, ref } from 'vue';
import { Search, RotateCcw, Eye, Trash2, Copy, Inbox, ShieldCheck } from 'lucide-vue-next';
import { api, time, copyText } from '../api';
import Pagination from '../components/Pagination.vue';
import Modal from '../components/Modal.vue';
const notify = inject('notify'),
  confirm = inject('confirm');
const filters = reactive({ signature: '', deviceId: '', from: '', to: '' });
const data = ref({ items: [], total: 0 }),
  page = ref(1),
  devices = ref([]),
  signatures = ref([]),
  loading = ref(false),
  error = ref(''),
  detail = ref(null);
let controller;
async function load(nextPage = page.value) {
  controller?.abort();
  controller = new AbortController();
  const current = controller;
  page.value = nextPage;
  loading.value = true;
  error.value = '';
  try {
    data.value = await api('/messages', {
      signal: current.signal,
      query: {
        page: page.value,
        signature: filters.signature,
        deviceId: filters.deviceId,
        from: filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : '',
        to: filters.to ? new Date(`${filters.to}T23:59:59.999`).getTime() : '',
      },
    });
  } catch (e) {
    if (e.name !== 'AbortError') {
      error.value = e.message;
      notify(e.message, 'error');
    }
  } finally {
    if (current === controller) loading.value = false;
  }
}
onMounted(async () => {
  await load();
  try {
    [devices.value, signatures.value] = await Promise.all([api('/devices'), api('/signatures')]);
  } catch (e) {
    notify(e.message, 'error');
  }
});
onBeforeUnmount(() => controller?.abort());
defineExpose({ refresh: () => load() });
function reset() {
  Object.assign(filters, { signature: '', deviceId: '', from: '', to: '' });
  load(1);
}
async function reveal(message) {
  try {
    detail.value = await api(`/messages/${message.id}`);
  } catch (e) {
    notify(e.message, 'error');
  }
}
async function remove(message) {
  if (
    !(await confirm('删除短信', `确定删除「${message.signature}」的这条短信吗？删除后无法恢复。`))
  )
    return;
  try {
    await api(`/messages/${message.id}`, { method: 'DELETE' });
    detail.value = null;
    notify('短信已删除');
    await load(data.value.items.length === 1 ? Math.max(1, page.value - 1) : page.value);
  } catch (e) {
    notify(e.message, 'error');
  }
}
async function copy() {
  try {
    await copyText(detail.value.code);
    notify('验证码已复制');
  } catch (e) {
    notify(e.message, 'error');
  }
}
</script>
<template>
  <section class="panel">
    <form class="filter-bar" @submit.prevent="load(1)">
      <label class="filter-field"
        >短信签名<input
          v-model="filters.signature"
          list="signature-options"
          placeholder="全部签名"
          maxlength="64" /><datalist id="signature-options">
          <option
            v-for="item in signatures"
            :key="item.signature"
            :value="item.signature"
          /></datalist></label
      ><label class="filter-field"
        >来源设备<select v-model="filters.deviceId">
          <option value="">全部设备</option>
          <option v-for="device in devices" :key="device.id" :value="device.id">
            {{ device.name }}
          </option>
        </select></label
      ><label class="filter-field">开始日期<input v-model="filters.from" type="date" /></label
      ><label class="filter-field">结束日期<input v-model="filters.to" type="date" /></label
      ><button class="button primary" :disabled="loading"><Search :size="16" /> 查询</button
      ><button type="button" class="icon-button" aria-label="重置筛选" @click="reset">
        <RotateCcw :size="17" />
      </button>
    </form>
    <div class="list-heading">
      <span
        >短信记录 <b>{{ data.total }}</b></span
      ><span class="muted small-text"
        ><ShieldCheck :size="14" /> 内容加密存储 · 查看详情记入审计</span
      >
    </div>
    <div v-if="error" class="inline-error">{{ error }}</div>
    <div v-if="loading" class="loading-panel">正在查询短信…</div>
    <div v-else-if="!data.items.length" class="empty-state">
      <Inbox :size="38" />
      <h3>没有匹配的短信</h3>
      <p>调整筛选条件，或等待设备上传新的验证码。</p>
    </div>
    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>短信签名</th>
            <th>验证码</th>
            <th>发送号码</th>
            <th>来源设备</th>
            <th>短信接收时间</th>
            <th class="align-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="message in data.items" :key="message.id">
            <td>
              <span class="signature-badge">{{ message.signature }}</span>
            </td>
            <td class="masked-code">{{ message.code }}</td>
            <td class="mono small-text">{{ message.sender }}</td>
            <td>{{ message.deviceName }}</td>
            <td class="muted small-text">{{ time(message.receivedAt) }}</td>
            <td>
              <div class="row-actions">
                <button
                  class="icon-button"
                  title="查看短信详情"
                  aria-label="查看短信详情"
                  @click="reveal(message)"
                >
                  <Eye :size="17" /></button
                ><button
                  class="icon-button danger"
                  title="删除短信"
                  aria-label="删除短信"
                  @click="remove(message)"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Pagination :page="page" :total="data.total" :disabled="loading" @change="load" />
  </section>
  <Modal v-if="detail" title="验证码短信详情" @close="detail = null"
    ><div class="detail-meta">
      <span class="signature-badge">{{ detail.signature }}</span
      ><span class="muted">{{ time(detail.receivedAt) }}</span>
    </div>
    <div class="code-display">
      <span>验证码</span><strong>{{ detail.code }}</strong
      ><button class="icon-button" aria-label="复制验证码" @click="copy">
        <Copy :size="19" />
      </button>
    </div>
    <label class="field"
      >短信原文
      <div class="message-body">{{ detail.body }}</div></label
    >
    <dl class="detail-list">
      <dt>发送号码</dt>
      <dd>{{ detail.sender }}</dd>
      <dt>设备 ID</dt>
      <dd class="mono small-text">{{ detail.deviceId }}</dd>
      <dt>上传时间</dt>
      <dd>{{ time(detail.uploadedAt) }}</dd>
    </dl>
    <div class="modal-actions">
      <button class="button secondary" @click="detail = null">关闭</button>
    </div></Modal
  >
</template>
