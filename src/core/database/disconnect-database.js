import { logger } from '../logging/logger.js';
import { prisma } from './prisma.js';

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info('database disconnected');
  } catch (error) {
    logger.error({err: error}, 'database disconnection failed');
    throw error;
  }
}
