<script setup>
import { inject, onMounted, ref } from 'vue';
import { Save, Plus, Trash2, Settings2, ShieldCheck } from 'lucide-vue-next';
import { api, session } from '../api';
import Modal from '../components/Modal.vue';
const notify = inject('notify'),
  confirm = inject('confirm'),
  settings = ref(null),
  rules = ref([]),
  rule = ref(null),
  saving = ref(false);
const password = ref({ currentPassword: '', newPassword: '' });
async function load() {
  try {
    [settings.value, rules.value] = await Promise.all([api('/settings'), api('/rules')]);
  } catch (e) {
    notify(e.message, 'error');
  }
}
onMounted(load);
defineExpose({ refresh: load });
async function saveSettings() {
  if (!(await confirm('保存保留策略', '保存后会立即清理超出保留期限的短信和审计记录。'))) return;
  saving.value = true;
  try {
    await api('/settings', { method: 'PUT', body: settings.value });
    notify('设置已保存');
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    saving.value = false;
  }
}
async function saveRule() {
  saving.value = true;
  try {
    await api('/rules', { method: 'PUT', body: rule.value });
    rule.value = null;
    await load();
    notify('识别规则已保存');
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    saving.value = false;
  }
}
async function deleteRule(item) {
  if (
    !(await confirm(
      '删除识别规则',
      `删除「${item.signature}」的自定义规则后，将使用默认识别规则。`,
    ))
  )
    return;
  try {
    await api(`/rules/${encodeURIComponent(item.signature)}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    notify(e.message, 'error');
  }
}
async function changePassword() {
  saving.value = true;
  try {
    await api('/password', { method: 'POST', body: password.value });
    session.username = '';
    session.csrfToken = '';
    notify('密码已更新，请重新登录');
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <div class="settings-grid">
    <section class="panel settings-panel">
      <div class="panel-heading">
        <div>
          <h3><Settings2 :size="18" /> 数据与有效期</h3>
          <p>控制短信保存时间与接口返回范围</p>
        </div>
      </div>
      <form v-if="settings" @submit.prevent="saveSettings">
        <label class="field"
          >短信保留天数<input
            v-model.number="settings.retentionDays"
            type="number"
            min="1"
            max="365"
            required /></label
        ><label class="field"
          >审计保留天数<input
            v-model.number="settings.auditRetentionDays"
            type="number"
            min="1"
            max="365"
            required /></label
        ><label class="field"
          >验证码查询有效期（秒）<input
            v-model.number="settings.codeMaxAgeSeconds"
            type="number"
            min="30"
            max="86400"
            required
        /></label>
        <p class="form-hint">
          查询接口不会返回超过此有效期的验证码。到期数据按小时清理，修改保留策略会立即清理。
        </p>
        <button class="button primary" :disabled="saving"><Save :size="16" /> 保存设置</button>
      </form>
    </section>
    <section class="panel settings-panel">
      <div class="panel-heading">
        <div>
          <h3><ShieldCheck :size="18" /> 管理员密码</h3>
          <p>修改后所有管理登录会话立即失效</p>
        </div>
      </div>
      <form @submit.prevent="changePassword">
        <label class="field"
          >当前密码<input
            v-model="password.currentPassword"
            type="password"
            required
            autocomplete="current-password"
            maxlength="256" /></label
        ><label class="field"
          >新密码<input
            v-model="password.newPassword"
            type="password"
            minlength="12"
            maxlength="256"
            required
            autocomplete="new-password"
            placeholder="至少 12 个字符" /></label
        ><button class="button secondary" :disabled="saving">更新密码</button>
      </form>
    </section>
  </div>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <h3>签名识别规则</h3>
        <p>为特殊短信格式指定关键词、长度和字符类型；仅影响后续上传。</p>
      </div>
      <button
        class="button secondary"
        @click="rule = { signature: '', keyword: '', codeLength: 0, alphabet: 'digits' }"
      >
        <Plus :size="16" /> 新增规则
      </button>
    </div>
    <div v-if="!rules.length" class="empty-state compact">
      <p>当前使用默认关键词识别 4～8 位数字验证码。</p>
    </div>
    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>签名</th>
            <th>关键词</th>
            <th>长度</th>
            <th>字符类型</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in rules" :key="item.signature">
            <td>{{ item.signature }}</td>
            <td>{{ item.keyword || '默认关键词' }}</td>
            <td>{{ item.codeLength || '自动' }}</td>
            <td>{{ item.alphabet === 'digits' ? '数字' : '字母和数字' }}</td>
            <td class="row-actions">
              <button
                class="text-button"
                @click="
                  rule = {
                    signature: item.signature,
                    keyword: item.keyword,
                    codeLength: item.codeLength,
                    alphabet: item.alphabet,
                  }
                "
              >
                编辑</button
              ><button class="icon-button danger" aria-label="删除规则" @click="deleteRule(item)">
                <Trash2 :size="16" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  <Modal v-if="rule" title="验证码识别规则" @close="!saving && (rule = null)"
    ><form @submit.prevent="saveRule">
      <label class="field">短信签名<input v-model="rule.signature" required maxlength="64" /></label
      ><label class="field"
        >定位关键词<input
          v-model="rule.keyword"
          maxlength="32"
          placeholder="留空使用默认关键词" /></label
      ><label class="field"
        >验证码长度<input v-model.number="rule.codeLength" type="number" min="0" max="10" required
      /></label>
      <p class="form-hint">0 为自动识别；自定义长度为 4～10，纯数字最多 8 位。</p>
      <label class="field"
        >字符类型<select v-model="rule.alphabet">
          <option value="digits">纯数字</option>
          <option value="alphanumeric">字母和数字（至少包含一位数字）</option>
        </select></label
      >
      <div class="modal-actions">
        <button class="button primary" :disabled="saving">保存规则</button>
      </div>
    </form></Modal
  >
</template>
