import { defineConfig } from 'wxt';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [svgr()],
  }),
  manifest: {
    name: 'Chrome Extension',
    description: 'A sidepanel extension built with WXT, React, and TypeScript.',
    host_permissions: ['<all_urls>'],
    permissions: ['storage', 'activeTab', 'scripting', 'tabs'],
    action: {
      default_title: 'Open sidepanel',
    },
  },
});
