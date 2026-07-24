import { logger } from '../logging/logger.js';
import { prisma } from './prisma.js';

export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.warn({err: error}, 'database readiness check failed');
    return false;
  }
}
