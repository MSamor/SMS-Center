<script setup>
import { inject, onMounted, ref, reactive } from 'vue';
import { Search, ScrollText } from 'lucide-vue-next';
import { api, time } from '../api';
import Pagination from '../components/Pagination.vue';
const notify = inject('notify'),
  data = ref({ items: [], total: 0 }),
  page = ref(1),
  loading = ref(false);
const filters = reactive({ action: 'query', signature: '', status: '' });
const labels = {
  query: '验证码查询',
  upload: '短信上传',
  'admin.reveal': '查看明文',
  'admin.login': '管理员登录',
};
async function load(next = page.value) {
  loading.value = true;
  page.value = next;
  try {
    data.value = await api('/audits', { query: { page: next, ...filters } });
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    loading.value = false;
  }
}
onMounted(load);
defineExpose({ refresh: () => load() });
</script>
<template>
  <section class="panel">
    <form class="filter-bar" @submit.prevent="load(1)">
      <label class="filter-field"
        >操作类型<select v-model="filters.action">
          <option value="">全部操作</option>
          <option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option>
        </select></label
      ><label class="filter-field"
        >短信签名<input v-model="filters.signature" placeholder="全部签名" maxlength="64" /></label
      ><label class="filter-field"
        >请求结果<select v-model="filters.status">
          <option value="">全部结果</option>
          <option value="success">成功</option>
          <option value="failure">失败</option>
        </select></label
      ><button class="button primary" :disabled="loading"><Search :size="16" /> 查询</button>
    </form>
    <div v-if="loading" class="loading-panel">正在加载审计…</div>
    <div v-else-if="!data.items.length" class="empty-state">
      <ScrollText :size="36" />
      <h3>没有匹配的审计记录</h3>
      <p>接口访问、权限拒绝和明文查看都会留下记录。</p>
    </div>
    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>操作 / 凭证</th>
            <th>短信签名</th>
            <th>状态码</th>
            <th>来源 IP</th>
            <th>耗时</th>
            <th>请求时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data.items" :key="item.id">
            <td>
              {{ labels[item.action] || item.action }}
              <div class="small-text muted">{{ item.tokenName || '未认证' }}</div>
            </td>
            <td>{{ item.signature || '—' }}</td>
            <td>
              <span class="status" :class="item.status < 400 ? 'green' : 'red'">{{
                item.status
              }}</span>
            </td>
            <td class="mono small-text">{{ item.ip }}</td>
            <td>{{ item.durationMs }} ms</td>
            <td class="small-text muted">{{ time(item.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <Pagination :page="page" :total="data.total" :disabled="loading" @change="load" />
  </section>
  <div class="info-box">
    <ScrollText :size="19" />
    <p>审计记录不保存短信正文、验证码或完整 Token。可在系统设置中调整审计保留期限。</p>
  </div>
</template>
