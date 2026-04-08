import { defineConfig } from 'wxt';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      const requiredPermissions = [
        'storage',
        'activeTab',
        'scripting',
        'tabs',
        'sidePanel',
      ];

      manifest.name = 'StinkyBoul';
      manifest.description =
        'Save hunt codes and autofill tag details from a Chrome side panel.';
      manifest.icons = {
        16: 'icon-16.png',
        48: 'icon-48.png',
        128: 'icon-128.png',
      };
      manifest.permissions = Array.from(
        new Set([...(manifest.permissions ?? []), ...requiredPermissions]),
      );
    },
  },
  vite: () => ({
    plugins: [svgr()],
  }),
  manifest: {
    name: 'StinkyBoul',
    description:
      'Save hunt codes and autofill tag details from a Chrome side panel.',
    host_permissions: ['<all_urls>'],
    permissions: ['storage', 'activeTab', 'scripting', 'tabs'],
    icons: {
      16: 'icon-16.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    action: {
      default_title: 'Open StinkyBoul',
    },
  },
});
