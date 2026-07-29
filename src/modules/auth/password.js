const DUMMY_PASSWORD = 'Pulse invalid credential timing value 2026!';
let dummyHashPromise;
let argon2Promise;

async function loadArgon2() {
  argon2Promise ??= import('argon2').then((module) => module.default);
  return argon2Promise;
}

export async function hashPassword(password) {
  const argon2 = await loadArgon2();
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });
}

export async function verifyPassword(passwordHash, password) {
  const argon2 = await loadArgon2();
  return argon2.verify(passwordHash, password);
}

export function getDummyPasswordHash() {
  dummyHashPromise ??= hashPassword(DUMMY_PASSWORD);
  return dummyHashPromise;
}

export function validatePasswordStrength(password) {
  const errors = [];
  if (typeof password !== 'string' || password.length < 12) errors.push('at least 12 characters');
  if (!/[a-z]/.test(password)) errors.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) errors.push('an uppercase letter');
  if (!/\d/.test(password)) errors.push('a number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('a symbol');
  return errors;
}
