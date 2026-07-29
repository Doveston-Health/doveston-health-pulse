import { prisma } from '../../core/database/prisma.js';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { toAuthenticatedUser } from './auth.service.js';

function isApiRequest(request) {
  return request.path.startsWith('/api/') || request.originalUrl.startsWith('/api/');
}

export const loadAuthenticatedUser = asyncHandler(async (request, _response, next) => {
  const userId = request.session?.userId;
  if (!userId) return next();

  const user = await prisma.user.findUnique({
    where: {id: userId},
    include: {roles: {include: {role: true}}}
  });

  if (!user?.isActive || !user.passwordHash) {
    await new Promise((resolve) => request.session.destroy(() => resolve()));
    return next();
  }

  request.authenticatedUser = toAuthenticatedUser(user);
  next();
});

export function requireAuthentication(request, response, next) {
  if (request.authenticatedUser) return next();

  if (isApiRequest(request)) {
    return response.status(401).json({
      error: 'Authentication required.',
      requestId: request.id
    });
  }

  response.redirect(303, '/login');
}

export function requireRole(...allowedRoles) {
  const allowed = new Set(allowedRoles);

  return function authorizeRole(request, response, next) {
    if (!request.authenticatedUser) return requireAuthentication(request, response, next);
    if (request.authenticatedUser.roles.some((role) => allowed.has(role))) return next();

    response.status(403).json({
      error: 'You do not have permission to access this resource.',
      requestId: request.id
    });
  };
}
