<script setup>
import { computed, inject, onMounted, ref } from 'vue';
import {
  MessageSquare,
  Smartphone,
  ArrowUpRight,
  Activity,
  ShieldCheck,
  ArrowRight,
  Inbox,
} from 'lucide-vue-next';
import { api, time } from '../api';
const notify = inject('notify'),
  emit = defineEmits(['navigate']);
const data = ref(null),
  loading = ref(true),
  error = ref('');
async function load() {
  loading.value = true;
  error.value = '';
  try {
    data.value = await api('/overview');
  } catch (e) {
    error.value = e.message;
    notify(e.message, 'error');
  } finally {
    loading.value = false;
  }
}
onMounted(load);
defineExpose({ refresh: load });
const days = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 6 + i);
    const key = date.toISOString().slice(0, 10);
    return {
      label: key.slice(5).replace('-', '/'),
      count: data.value?.series.find((v) => v.day === key)?.count || 0,
    };
  }),
);
const max = computed(() => Math.max(4, ...days.value.map((v) => v.count)));
const points = computed(() =>
  days.value.map((v, i) => `${55 + i * 100},${190 - (v.count / max.value) * 145}`).join(' '),
);
const cards = computed(() =>
  data.value
    ? [
        {
          label: '短信总量',
          value: data.value.total,
          caption: '保留期内的验证码短信',
          icon: MessageSquare,
          color: 'blue',
        },
        {
          label: '近 24 小时接收',
          value: data.value.last24h,
          caption: '已成功入库',
          icon: ArrowUpRight,
          color: 'teal',
        },
        {
          label: '已启用设备',
          value: data.value.deviceCount,
          caption: '独立设备，独立上传凭证',
          icon: Smartphone,
          color: 'violet',
        },
        {
          label: '近 24 小时查询',
          value: data.value.queryCount,
          caption: `${data.value.failedQueries} 次未成功 · 已记录审计`,
          icon: Activity,
          color: 'amber',
        },
      ]
    : [],
);
</script>
<template>
  <div v-if="loading && !data" class="loading-panel">正在加载概览…</div>
  <div v-else-if="error && !data" class="empty-state">
    <h3>{{ error }}</h3>
    <button class="button primary" @click="load">重新加载</button>
  </div>
  <template v-else-if="data">
    <div class="welcome-banner">
      <div>
        <span class="eyebrow">让每一条验证码，都有迹可循</span>
        <h2>短信管理，从这里开始。</h2>
        <p>连接你的 Android 设备，集中管理验证码与接口访问。</p>
      </div>
      <div class="banner-icon">
        <MessageSquare :size="48" /><span class="mini-shield"><ShieldCheck :size="22" /></span>
      </div>
    </div>
    <div class="metric-grid">
      <article v-for="card in cards" :key="card.label" class="metric-card">
        <div class="metric-top">
          <span>{{ card.label }}</span
          ><span class="metric-icon" :class="card.color"
            ><component :is="card.icon" :size="18"
          /></span>
        </div>
        <strong>{{ card.value.toLocaleString() }}</strong>
        <p>{{ card.caption }}</p>
      </article>
    </div>
    <div class="overview-grid">
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h3>短信接收趋势</h3>
            <p>过去 7 个自然日 · UTC</p>
          </div>
          <span class="chart-legend"><i></i> 接收短信</span>
        </div>
        <svg
          class="line-chart"
          viewBox="0 0 710 240"
          role="img"
          :aria-label="days.map((v) => `${v.label} ${v.count} 条`).join('，')"
        >
          <defs>
            <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3b82f6" stop-opacity=".17" />
              <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
            </linearGradient>
          </defs>
          <g v-for="n in 4" :key="n">
            <line
              x1="45"
              :y1="190 - (n - 1) * 48"
              x2="670"
              :y2="190 - (n - 1) * 48"
              stroke="#e8edf5"
              stroke-dasharray="4 5"
            />
            <text x="30" :y="194 - (n - 1) * 48" text-anchor="end" fill="#94a3b8" font-size="11">
              {{ Math.round(((n - 1) * max) / 3) }}
            </text>
          </g>
          <polygon :points="`55,190 ${points} 655,190`" fill="url(#chart-fill)" />
          <polyline
            :points="points"
            fill="none"
            stroke="#3b82f6"
            stroke-width="3"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <g v-for="(day, i) in days" :key="day.label">
            <circle
              :cx="55 + i * 100"
              :cy="190 - (day.count / max) * 145"
              r="4"
              fill="white"
              stroke="#3b82f6"
              stroke-width="2"
            >
              <title>{{ day.label }}：{{ day.count }} 条</title>
            </circle>
            <text :x="55 + i * 100" y="224" text-anchor="middle" fill="#94a3b8" font-size="12">
              {{ day.label }}
            </text>
          </g>
        </svg>
      </section>
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h3>短信签名分布</h3>
            <p>按服务来源自动分类</p>
          </div>
          <span class="subtle-chip">TOP 6</span>
        </div>
        <div v-if="!data.topSignatures.length" class="empty-state compact">
          <Inbox :size="32" />
          <p>接入设备后，这里会显示签名分布</p>
        </div>
        <div v-else class="signature-list">
          <div v-for="(item, i) in data.topSignatures" :key="item.signature" class="signature-row">
            <div class="signature-label">
              <span class="signature-avatar" :class="['blue', 'teal', 'violet', 'amber'][i % 4]">{{
                item.signature.slice(0, 1)
              }}</span
              ><span>{{ item.signature }}</span
              ><strong>{{ item.count }}</strong>
            </div>
            <div class="progress-track">
              <span :style="{ width: `${(item.count / Math.max(1, data.total)) * 100}%` }"></span>
            </div>
          </div>
        </div>
      </section>
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>最新接收</h3>
          <p>验证码内容已加密存储</p>
        </div>
        <button class="text-button" @click="emit('navigate', 'messages')">
          查看全部 <ArrowRight :size="15" />
        </button>
      </div>
      <div v-if="!data.recentMessages.length" class="empty-state compact">
        <Inbox :size="32" />
        <h3>还没有短信记录</h3>
        <p>先创建设备，再在手机 App 中配置上传 Token。</p>
        <button class="button secondary" @click="emit('navigate', 'devices')">
          接入第一台设备 <ArrowRight :size="15" />
        </button>
      </div>
      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>短信签名</th>
              <th>来源设备</th>
              <th>接收时间</th>
              <th>存储状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="message in data.recentMessages" :key="message.id">
              <td>
                <span class="signature-badge">{{ message.signature }}</span>
              </td>
              <td>{{ message.deviceName }}</td>
              <td class="muted">{{ time(message.receivedAt) }}</td>
              <td>
                <span class="status green"><ShieldCheck :size="13" /> 已加密</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </template>
</template>
