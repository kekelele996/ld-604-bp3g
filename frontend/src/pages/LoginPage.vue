<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { useAuthStore } from "../stores/AuthStore";

const emit = defineEmits<{ (e: "logged-in"): void }>();
const auth = useAuthStore();
const username = ref("dispatcher");
const loading = ref(false);

const demoAccounts = [
  { username: "dispatcher", label: "调度员（派工/关闭）" },
  { username: "crew_leader", label: "班组长（到场/抢修/复电）" },
  { username: "warehouse", label: "仓管（备件审批）" },
  { username: "auditor", label: "审计员（只读）" },
  { username: "admin", label: "管理员（全部权限）" }
];

async function submit() {
  if (!username.value) {
    ElMessage.warning("请选择演示账号");
    return;
  }
  loading.value = true;
  try {
    await auth.login(username.value);
    ElMessage.success(`欢迎，${auth.user?.name ?? username.value}`);
    emit("logged-in");
  } catch (err) {
    ElMessage.error((err as { message?: string }).message ?? "登录失败");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-wrap">
    <el-card class="login-card" shadow="always">
      <template #header>
        <div class="login-title">
          <el-icon size="22"><Lightning /></el-icon>
          <span>电力配网抢修工单系统</span>
        </div>
        <div class="login-sub">grid-repair · 抢修派工 / 备件领用 / 复电跟踪</div>
      </template>

      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="演示账号（密码统一 grid-repair）">
          <el-select v-model="username" placeholder="选择账号" style="width: 100%">
            <el-option
              v-for="account in demoAccounts"
              :key="account.username"
              :label="account.label"
              :value="account.username"
            />
          </el-select>
        </el-form-item>
        <el-button type="primary" style="width: 100%" :loading="loading" @click="submit">
          登 录
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #1f3d2c 0%, #2d5a42 60%, #3a6b4f 100%);
  padding: 20px;
}
.login-card { width: min(440px, 100%); border-radius: 14px; }
.login-title { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 700; }
.login-sub { color: var(--el-text-color-secondary); font-size: 12px; margin-top: 4px; }
</style>
