// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';
import dotenv from 'dotenv';

// Vitest 默认不读 .env.local，显式加载 Supabase key
dotenv.config({ path: '.env.local' });

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
