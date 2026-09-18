<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { login } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import type { ApiError } from "../api/http";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const username = ref("dispatcher");
const loading = ref(false);
const error = ref("");

const accounts = [
  { username: "dispatcher", label: "调度员张敏" },
  { username: "leader1", label: "班长李刚" },
  { username: "keeper", label: "仓管王芳" },
  { username: "auditor", label: "审计员赵磊" },
];

async function submit() {
  loading.value = true;
  error.value = "";
  try {
    const res = await login(username.value);
    authStore.setSession(res.token, res.user);
    router.push((route.query.redirect as string) || "/dashboard");
  } catch (e) {
    error.value = (e as ApiError).message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-wrap">
    <form class="login-card" @submit.prevent="submit">
      <h1>⚡ 电力配网抢修工单系统</h1>
      <p class="sub">grid-repair 调度工作台</p>
      <label class="field">
        <span>账号</span>
        <input v-model="username" class="input" placeholder="输入种子账号" required />
      </label>
      <div class="quick-accounts">
        <button
          v-for="acc in accounts"
          :key="acc.username"
          type="button"
          class="chip-btn"
          :class="{ active: username === acc.username }"
          @click="username = acc.username"
        >{{ acc.label }}</button>
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>
      <button class="btn btn-primary login-btn" :disabled="loading">{{ loading ? "登录中…" : "登 录" }}</button>
    </form>
  </div>
</template>
