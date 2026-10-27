import { createApp } from "vue";
import App from "./App.vue";
import { setLocale } from '@celestia-island/hikari';
import { installHkTooltipBridge } from '@celestia-island/hikari/runtime';
import "@celestia-island/hikari/styles";
import "./styles.css";
void setLocale('zh-Hans');
createApp(App).mount("#app");
installHkTooltipBridge();
