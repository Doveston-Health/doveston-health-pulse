import { config } from '../src/core/config/index.js';
import { disconnectDatabase } from '../src/core/database/disconnect-database.js';
import { prisma } from '../src/core/database/prisma.js';
import { logger } from '../src/core/logging/logger.js';
import { normalizeEmail } from '../src/modules/auth/auth.service.js';
import { hashPassword, validatePasswordStrength } from '../src/modules/auth/password.js';

function validateBootstrapInput() {
  const email = normalizeEmail(config.bootstrap.email);
  const displayName = config.bootstrap.name?.trim();
  const password = config.bootstrap.password;
  const errors = [];

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('BOOTSTRAP_ADMIN_EMAIL must be a valid email address.');
  if (!displayName || displayName.length < 2) errors.push('BOOTSTRAP_ADMIN_NAME must contain at least two characters.');

  const passwordErrors = validatePasswordStrength(password || '');
  if (passwordErrors.length > 0) {
    errors.push(`BOOTSTRAP_ADMIN_PASSWORD must contain ${passwordErrors.join(', ')}.`);
  }

  if (errors.length > 0) throw new Error(errors.join(' '));
  return {email, displayName, password};
}

async function bootstrapDirector() {
  const {email, displayName, password} = validateBootstrapInput();
  const existingUser = await prisma.user.findUnique({where: {email}, select: {id: true}});
  if (existingUser) throw new Error('A user with BOOTSTRAP_ADMIN_EMAIL already exists; no changes were made.');

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (transaction) => {
    const directorRole = await transaction.role.upsert({
      where: {name: 'DIRECTOR'},
      update: {description: 'Executive access across Pulse.'},
      create: {name: 'DIRECTOR', description: 'Executive access across Pulse.'}
    });
    const createdUser = await transaction.user.create({
      data: {email, displayName, passwordHash}
    });
    await transaction.userRole.create({
      data: {userId: createdUser.id, roleId: directorRole.id}
    });
    await transaction.auditLog.createMany({
      data: [
        {
          actorUserId: createdUser.id,
          action: 'USER_BOOTSTRAPPED',
          entityType: 'User',
          entityId: createdUser.id
        },
        {
          actorUserId: createdUser.id,
          action: 'ROLE_ASSIGNED',
          entityType: 'UserRole',
          entityId: createdUser.id,
          metadata: {role: 'DIRECTOR'}
        }
      ]
    });
    return createdUser;
  });

  logger.info({userId: user.id, email: user.email}, 'initial director bootstrapped');
}

try {
  await bootstrapDirector();
} catch (error) {
  logger.error({err: error}, 'director bootstrap failed');
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
