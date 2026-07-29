import { prisma } from '../src/core/database/prisma.js';
import { disconnectDatabase } from '../src/core/database/disconnect-database.js';

const roles = [
  {name: 'DIRECTOR', description: 'Executive access across Pulse.'},
  {name: 'PRACTICE_MANAGER', description: 'Practice management and operational access.'},
  {name: 'ADMIN', description: 'Administrative access to Pulse operations.'},
  {name: 'CLINICIAN', description: 'Clinical team access to Pulse workflows.'}
];

const integrations = [
  {provider: 'CLINIKO', displayName: 'Cliniko'},
  {provider: 'XERO', displayName: 'Xero'}
];

async function seed() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: {name: role.name},
      update: {description: role.description},
      create: role
    });
  }

  for (const integration of integrations) {
    await prisma.integration.upsert({
      where: {provider: integration.provider},
      update: {displayName: integration.displayName},
      create: {
        ...integration,
        status: 'NOT_CONFIGURED'
      }
    });
  }
}

try {
  await seed();
} finally {
  await disconnectDatabase();
}
