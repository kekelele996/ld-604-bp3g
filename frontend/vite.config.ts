import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 20104,
    host: "0.0.0.0",
    // 本地开发：前端统一请求 /api，由 dev server 代理到后端容器内端口
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://localhost:21104",
        changeOrigin: true
      }
    }
  }
});
