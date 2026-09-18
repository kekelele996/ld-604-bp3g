<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { navItems } from "./router";
import { useAuthStore } from "./stores/authStore";
import { ROLE_LABEL } from "./constants/Role";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const currentTitle = computed(() => (route.meta.title as string) ?? "电力配网抢修");

function logout() {
  authStore.clear();
  router.push("/login");
}
</script>

<template>
  <router-view v-if="route.meta.public" />
  <div v-else class="shell">
    <aside class="sidebar">
      <div class="brand">⚡ 配网抢修</div>
      <nav class="nav">
        <RouterLink v-for="item in navItems" :key="item.route" :to="item.route" class="nav-link" active-class="active">
          {{ item.name }}
        </RouterLink>
      </nav>
      <div class="sidebar-foot">
        <div class="user-box">
          <strong>{{ authStore.user?.displayName ?? "未登录" }}</strong>
          <span>{{ ROLE_LABEL[authStore.role] ?? authStore.role }}</span>
        </div>
        <button class="btn btn-ghost btn-sm" @click="logout">退出登录</button>
      </div>
    </aside>
    <main class="page">
      <header class="page-head">
        <h1>{{ currentTitle }}</h1>
      </header>
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>
