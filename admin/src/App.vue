<script setup>
import { computed, onMounted, onBeforeUnmount, provide, ref } from 'vue';
import {
  MessageSquare,
  LayoutDashboard,
  Smartphone,
  KeyRound,
  ScrollText,
  Settings,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Menu,
  X,
  ArrowRight,
} from 'lucide-vue-next';
import { api, session } from './api';
import Modal from './components/Modal.vue';
import InitialPassword from './components/InitialPassword.vue';
import Overview from './pages/Overview.vue';
import Messages from './pages/Messages.vue';
import Devices from './pages/Devices.vue';
import Tokens from './pages/Tokens.vue';
import Audits from './pages/Audits.vue';
import SettingsPage from './pages/Settings.vue';
const navigation = [
  {
    key: 'overview',
    label: '数据概览',
    icon: LayoutDashboard,
    page: Overview,
    description: '集中掌握短信接收与接口使用情况',
  },
  {
    key: 'messages',
    label: '短信记录',
    icon: MessageSquare,
    page: Messages,
    description: '按签名、设备和时间查找验证码短信',
  },
  {
    key: 'devices',
    label: '设备管理',
    icon: Smartphone,
    page: Devices,
    description: '连接 Android 手机，管理独立上传凭证',
  },
  {
    key: 'tokens',
    label: '访问凭证',
    icon: KeyRound,
    page: Tokens,
    description: '为调用方分配验证码查询权限',
  },
  {
    key: 'audits',
    label: '接口审计',
    icon: ScrollText,
    page: Audits,
    description: '追踪接口调用、权限拒绝与明文查看',
  },
  {
    key: 'settings',
    label: '系统设置',
    icon: Settings,
    page: SettingsPage,
    description: '管理数据保留、识别规则和账户安全',
  },
];
const active = ref(
  navigation.some((v) => v.key === location.hash.slice(1)) ? location.hash.slice(1) : 'overview',
);
const current = computed(() => navigation.find((v) => v.key === active.value));
const pageRef = ref(null),
  ready = ref(false),
  loginBusy = ref(false),
  loginError = ref(''),
  username = ref('admin'),
  password = ref(''),
  mobileOpen = ref(false),
  toast = ref(null),
  confirmation = ref(null);
let toastTimer, resolveConfirm;
function notify(message, kind = 'success') {
  clearTimeout(toastTimer);
  toast.value = { message, kind };
  toastTimer = setTimeout(() => {
    toast.value = null;
  }, 4500);
}
function confirm(title, message) {
  if (resolveConfirm) resolveConfirm(false);
  confirmation.value = { title, message };
  return new Promise((resolve) => {
    resolveConfirm = resolve;
  });
}
function finishConfirm(value) {
  confirmation.value = null;
  resolveConfirm?.(value);
  resolveConfirm = null;
}
provide('notify', notify);
provide('confirm', confirm);
function navigate(key) {
  active.value = key;
  location.hash = key;
  mobileOpen.value = false;
}
function hashChange() {
  const key = location.hash.slice(1);
  if (navigation.some((v) => v.key === key)) active.value = key;
}
onMounted(async () => {
  window.addEventListener('hashchange', hashChange);
  try {
    Object.assign(session, await api('/me'));
  } catch (e) {
    if (e.status !== 401) loginError.value = e.message;
  } finally {
    ready.value = true;
  }
});
onBeforeUnmount(() => {
  window.removeEventListener('hashchange', hashChange);
  clearTimeout(toastTimer);
  resolveConfirm?.(false);
});
async function login() {
  loginBusy.value = true;
  loginError.value = '';
  try {
    Object.assign(
      session,
      await api('/login', {
        method: 'POST',
        body: { username: username.value, password: password.value },
      }),
    );
    password.value = '';
  } catch (e) {
    loginError.value = e.message;
  } finally {
    loginBusy.value = false;
  }
}
async function logout() {
  try {
    await api('/logout', { method: 'POST' });
    session.username = '';
    session.csrfToken = '';
  } catch (e) {
    notify(e.message, 'error');
  }
}
</script>
<template>
  <div v-if="!ready" class="app-loading">正在连接短信中枢…</div>
  <div v-else-if="!session.username" class="login-layout">
    <div class="login-story">
      <div class="brand">
        <span class="brand-mark"><MessageSquare :size="25" /></span>
        <div><strong>短信中枢</strong><small>SMS CENTER</small></div>
      </div>
      <span class="eyebrow">YOUR CODES. ONE PLACE.</span>
      <h1>每一条验证码，<br />都在掌握之中。</h1>
      <p>从手机到服务中心，集中接收、安全存储、<br />按需获取，让验证码管理变得简单。</p>
      <div class="login-feature"><ShieldCheck :size="20" /> 加密存储 · 独立凭证 · 全程审计</div>
    </div>
    <main class="login-card">
      <span class="subtle-chip">管理中心</span>
      <h2>欢迎回来</h2>
      <p>登录后管理你的设备与验证码。</p>
      <form @submit.prevent="login">
        <label class="field"
          >用户名<input
            v-model="username"
            required
            autocomplete="username"
            maxlength="64"
            autofocus /></label
        ><label class="field"
          >密码<input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            maxlength="256"
        /></label>
        <div v-if="loginError" class="inline-error" role="alert">{{ loginError }}</div>
        <button class="button primary full-width" :disabled="loginBusy">
          {{ loginBusy ? '登录中…' : '登录管理中心' }}<ArrowRight :size="17" />
        </button>
      </form>
      <p class="login-note">首次启动使用初始化凭证登录，随后必须修改初始密码。</p>
    </main>
  </div>
  <InitialPassword v-else-if="session.mustChangePassword" />
  <div v-else class="app-shell">
    <div v-if="mobileOpen" class="sidebar-backdrop" @click="mobileOpen = false"></div>
    <aside class="sidebar" :class="{ open: mobileOpen }">
      <a class="brand" href="#overview" @click.prevent="navigate('overview')"
        ><span class="brand-mark"><MessageSquare :size="23" /></span>
        <div><strong>短信中枢</strong><small>SMS CENTER</small></div></a
      ><span class="nav-caption">工作空间</span>
      <nav aria-label="主导航">
        <button
          v-for="item in navigation"
          :key="item.key"
          :class="['nav-item', { active: active === item.key }]"
          :aria-current="active === item.key ? 'page' : undefined"
          @click="navigate(item.key)"
        >
          <component :is="item.icon" :size="19" />{{ item.label
          }}<span v-if="active === item.key" class="nav-dot"></span>
        </button>
      </nav>
      <div class="sidebar-bottom">
        <div class="secure-card">
          <ShieldCheck :size="20" />
          <div>
            <strong>安全连接，安心管理</strong>
            <p>AES-256-GCM 加密存储</p>
          </div>
        </div>
        <div class="account">
          <span class="avatar">{{ session.username.slice(0, 1).toUpperCase() }}</span>
          <div>
            <strong>{{ session.username }}</strong
            ><small>超级管理员</small>
          </div>
          <button class="icon-button" aria-label="退出登录" title="退出登录" @click="logout">
            <LogOut :size="17" />
          </button>
        </div>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div>
          <button class="icon-button mobile-menu" aria-label="打开菜单" @click="mobileOpen = true">
            <Menu :size="20" /></button
          ><span class="breadcrumb"
            >管理中心 <span>/</span> <b>{{ current.label }}</b></span
          >
        </div>
        <span class="environment"><i></i> 短信服务中心</span>
      </header>
      <main class="main-content">
        <div class="page-heading">
          <div>
            <h1>{{ current.label }}</h1>
            <p>{{ current.description }}</p>
          </div>
          <button class="button secondary" @click="pageRef?.refresh()">
            <RefreshCw :size="15" /> 刷新
          </button>
        </div>
        <component :is="current.page" ref="pageRef" :key="active" @navigate="navigate" />
        <footer class="page-footer">
          <span>SMS Center · 一站式验证码管理</span><span>安全存储，有迹可循</span>
        </footer>
      </main>
    </div>
  </div>
  <Teleport to="body"
    ><div v-if="toast" class="toast" :class="toast.kind" role="status">
      {{ toast.message
      }}<button aria-label="关闭提示" @click="toast = null">
        <X :size="16" />
      </button></div></Teleport
  ><Modal v-if="confirmation" :title="confirmation.title" @close="finishConfirm(false)"
    ><p class="confirm-message">{{ confirmation.message }}</p>
    <div class="modal-actions">
      <button class="button secondary" @click="finishConfirm(false)">取消</button
      ><button class="button primary" @click="finishConfirm(true)">确认</button>
    </div></Modal
  >
</template>
