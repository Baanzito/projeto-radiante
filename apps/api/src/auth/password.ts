import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';

const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const KEY_LENGTH = 32;
const MAX_MEMORY = 64 * 1024 * 1024;

function scrypt(
  value: string,
  salt: Buffer,
  cost: number,
  blockSize: number,
  parallelization: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(
      value,
      salt,
      KEY_LENGTH,
      {
        cost,
        blockSize,
        parallelization,
        maxmem: MAX_MEMORY,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(
    password,
    salt,
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
  );

  return [
    'scrypt',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  try {
    const [
      algorithm,
      costValue,
      blockSizeValue,
      parallelizationValue,
      saltValue,
      hashValue,
    ] = encodedHash.split('$');
    if (
      algorithm !== 'scrypt' ||
      !costValue ||
      !blockSizeValue ||
      !parallelizationValue ||
      !saltValue ||
      !hashValue
    ) {
      return false;
    }

    const expected = Buffer.from(hashValue, 'base64url');
    if (expected.length !== KEY_LENGTH) return false;

    const actual = await scrypt(
      password,
      Buffer.from(saltValue, 'base64url'),
      Number(costValue),
      Number(blockSizeValue),
      Number(parallelizationValue),
    );

    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
