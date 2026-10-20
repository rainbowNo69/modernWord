import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 部署平台（COZE）上页面由网关代理访问，HMR 需要走独立的 6000 端口对外 443；
// 本地直接访问时不设置这些，交给 Vite 使用同源默认值，否则 WebSocket 连不上。
const onHostingPlatform = Boolean(process.env.COZE_PROJECT_TYPE || process.env.COZE_EVAL);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: onHostingPlatform
      ? {
          overlay: true,
          path: '/hot/vite-hmr',
          port: 6000,
          clientPort: 443,
          timeout: 30000,
        }
      : {
          overlay: true,
        },
    watch: onHostingPlatform
      ? {
          usePolling: true,
          interval: 100,
        }
      : undefined,
  },
});
