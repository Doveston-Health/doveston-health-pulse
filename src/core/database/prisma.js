import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';
import { logger } from '../logging/logger.js';

const adapter = new PrismaPg(config.database.url);

export const prisma = new PrismaClient({adapter});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info('database connected');
    return true;
  } catch (error) {
    logger.error({err: error}, 'database connection failed');
    return false;
  }
}
