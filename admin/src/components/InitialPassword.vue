<script setup>
import { inject, ref } from 'vue';
import { ShieldCheck, LogOut } from 'lucide-vue-next';
import { api, session } from '../api';
const notify = inject('notify');
const currentPassword = ref('');
const newPassword = ref('');
const confirmation = ref('');
const busy = ref(false);
const error = ref('');
function clearSession() {
  Object.assign(session, { username: '', csrfToken: '', role: '', mustChangePassword: false });
}
async function submit() {
  error.value = '';
  if (newPassword.value !== confirmation.value) {
    error.value = '两次输入的新密码不一致';
    return;
  }
  if (newPassword.value === currentPassword.value) {
    error.value = '新密码不能与初始密码相同';
    return;
  }
  busy.value = true;
  try {
    await api('/password', {
      method: 'POST',
      body: { currentPassword: currentPassword.value, newPassword: newPassword.value },
    });
    currentPassword.value = '';
    newPassword.value = '';
    confirmation.value = '';
    clearSession();
    notify('密码已更新，请使用新密码重新登录');
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function logout() {
  busy.value = true;
  try {
    await api('/logout', { method: 'POST' });
    clearSession();
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="login-layout">
    <main class="login-card">
      <span class="subtle-chip">超级管理员 · 首次登录</span>
      <h2><ShieldCheck :size="23" /> 设置你的新密码</h2>
      <p>账号 {{ session.username }} 尚在使用初始密码。修改后才能进入管理中心。</p>
      <form @submit.prevent="submit">
        <label class="field"
          >初始密码<input
            v-model="currentPassword"
            type="password"
            required
            maxlength="256"
            autocomplete="current-password"
            autofocus
        /></label>
        <label class="field"
          >新密码<input
            v-model="newPassword"
            type="password"
            required
            minlength="12"
            maxlength="256"
            autocomplete="new-password"
            placeholder="至少 12 个字符，与初始密码不同"
        /></label>
        <label class="field"
          >确认新密码<input
            v-model="confirmation"
            type="password"
            required
            minlength="12"
            maxlength="256"
            autocomplete="new-password"
        /></label>
        <div v-if="error" class="inline-error" role="alert">{{ error }}</div>
        <button class="button primary full-width" :disabled="busy">
          {{ busy ? '处理中…' : '修改密码并重新登录' }}
        </button>
      </form>
      <p class="login-note">修改密码后，所有旧登录会话会立即失效。</p>
      <button class="text-button" :disabled="busy" @click="logout">
        <LogOut :size="15" /> 退出登录
      </button>
    </main>
  </div>
</template>
