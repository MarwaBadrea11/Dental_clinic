import bcrypt from 'bcrypt';

export async function hashPassword(plain, rounds) {
  return bcrypt.hash(plain, rounds);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
