import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

@Injectable()
export class PasswordService {
  constructor(private readonly config: ConfigService) {}

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await this.derive(password, salt);
    return `scrypt$${salt}$${derivedKey.toString('hex')}`;
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, salt, hash] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !hash) return false;

    const expected = Buffer.from(hash, 'hex');
    const actual = await this.derive(password, salt);

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private async derive(password: string, salt: string): Promise<Buffer> {
    const pepper = this.config.get<string>('dripdesk.passwordPepper', '');
    return (await scrypt(`${password}${pepper}`, salt, KEY_LENGTH)) as Buffer;
  }
}
