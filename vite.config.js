import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { appNamePlugin } from './scripts/vite-app-name.js';
import { APP_MOUNT } from './src/app-name.js';
export default defineConfig({ plugins: [vue(), appNamePlugin()], base: APP_MOUNT, server: { watch: { ignored: ['**/.wrangler/**'] } } });
