import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import App from "./App.vue";
import "./styles.css";

const app = createApp(App);
app.use(createPinia());
app.use(ElementPlus, { locale: zhCn });

// 全量注册 Element Plus 图标（组件内直接使用 <User /> 等）
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.mount("#app");
