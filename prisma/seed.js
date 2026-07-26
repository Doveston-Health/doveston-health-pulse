import { prisma } from '../src/core/database/prisma.js';
import { disconnectDatabase } from '../src/core/database/disconnect-database.js';

const roles = [
  {name: 'owner', description: 'Full ownership and administrative access.'},
  {name: 'admin', description: 'Administrative access to Pulse operations.'},
  {name: 'practitioner', description: 'Practitioner access to clinical workflows.'}
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
