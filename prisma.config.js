import { defineConfig } from 'prisma/config';
import { config } from './src/core/config/index.js';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js'
  },
  datasource: {
    url: config.database.url
  }
});
