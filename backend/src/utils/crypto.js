import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const hashPassword = async (password) => {
  if (!password) {
    throw new Error('Password is required for hashing');
  }

  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password, hash) => {
  if (!password || !hash) {
    throw new Error('Password and hash are required for verification');
  }

  return bcrypt.compare(password, hash);
};

export const getSaltRounds = () => SALT_ROUNDS;
