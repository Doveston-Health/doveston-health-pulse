import { config } from '../../core/config/index.js';
import { prisma } from '../../core/database/prisma.js';
import { AUTHENTICATION_ERROR } from './auth.constants.js';

export class AuthenticationError extends Error {
  constructor() {
    super(AUTHENTICATION_ERROR);
    this.name = 'AuthenticationError';
  }
}

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function toAuthenticatedUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles.map(({role}) => role.name)
  };
}

async function recordFailedLogin(client, user, now) {
  if (user) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const lockedUntil = failedLoginAttempts >= config.auth.maxFailedAttempts
      ? new Date(now.getTime() + config.auth.lockDurationMs)
      : user.lockedUntil;

    await client.user.update({
      where: {id: user.id},
      data: {failedLoginAttempts, lockedUntil}
    });
  }

  await client.auditLog.create({
    data: {
      actorUserId: user?.id,
      action: 'AUTH_LOGIN_FAILED',
      entityType: 'User',
      entityId: user?.id,
      metadata: {outcome: 'rejected'}
    }
  });
}

export async function authenticateUser({
  email,
  password,
  verifyPassword,
  dummyPasswordHash,
  client = prisma,
  now = new Date()
}) {
  const normalizedEmail = normalizeEmail(email);
  const user = normalizedEmail
    ? await client.user.findUnique({
        where: {email: normalizedEmail},
        include: {roles: {include: {role: true}}}
      })
    : null;

  const passwordMatches = await verifyPassword(user?.passwordHash || dummyPasswordHash, password || '');
  const isLocked = Boolean(user?.lockedUntil && user.lockedUntil > now);
  const accepted = Boolean(user && user.passwordHash && passwordMatches && user.isActive && !isLocked);

  if (!accepted) {
    await recordFailedLogin(client, user, now);
    throw new AuthenticationError();
  }

  const updatedUser = await client.user.update({
    where: {id: user.id},
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now
    },
    include: {roles: {include: {role: true}}}
  });

  await client.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'AUTH_LOGIN_SUCCEEDED',
      entityType: 'User',
      entityId: user.id
    }
  });

  return toAuthenticatedUser(updatedUser);
}

export async function recordLogout(userId, client = prisma) {
  await client.auditLog.create({
    data: {
      actorUserId: userId,
      action: 'AUTH_LOGOUT',
      entityType: 'User',
      entityId: userId
    }
  });
}
