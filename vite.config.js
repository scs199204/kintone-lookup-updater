import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import * as path from 'path';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig(() => {
  return {
    plugins: [vue(), cssInjectedByJsPlugin()],
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: path.resolve(__dirname, 'src/js/config.js'),
        output: {
          dir: 'dist',
          entryFileNames: `js/[name].js`,
          assetFileNames: (assetInfo) => {
            if (assetInfo.fileName && assetInfo.fileName.endsWith('.css')) {
              return `css/[name].css`;
            }
            if (assetInfo.fileName && assetInfo.fileName.endsWith('.html')) {
              return `html/[name].html`;
            }
            if (assetInfo.fileName && /\.(png|jpe?g|gif|svg|webp)$/.test(assetInfo.fileName)) {
              return 'image/[name].[ext]';
            }
            return 'assets/[name].[ext]';
          },
          format: 'iife',
          inlineDynamicImports: true,
          name: `kintoneLookupUpdaterPlugin`,
        },
      },
      sourcemap: 'inline',
      emptyOutDir: false,
    },
  };
});
