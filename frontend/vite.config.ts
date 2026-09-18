import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 20104,
    host: "0.0.0.0",
    proxy: {
      // 本地开发代理到后端；生产由 frontend/nginx.conf 反代到 http://backend:3000/api/
      "/api": {
        target: "http://127.0.0.1:21104",
        changeOrigin: true,
      },
    },
  },
});
