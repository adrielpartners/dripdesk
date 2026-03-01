import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { addMinutes } from 'date-fns';
import { slugify } from '@dripdesk/shared';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) throw new ConflictException('Email already in use');

    const slug = slugify(dto.organizationName);
    const existingOrg = await this.prisma.organization.findUnique({ where: { slug } });

    if (existingOrg) {
      throw new ConflictException('Organization name already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const org = await this.prisma.organization.create({
      data: {
        name: dto.organizationName,
        slug,
        trialEndsAt: addMinutes(new Date(), 60 * 24 * 14),
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'OWNER',
        organizationId: org.id,
      },
    });

    return this.createTokenResponse(user);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.createTokenResponse(user);
  }

  async requestMagicLink(email: string, orgSlug?: string) {
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      const orgConnect =
        orgSlug
          ? { organization: { connect: { slug: orgSlug } } }
          : {};

      user = await this.prisma.user.create({
        data: {
          email,
          role: 'MEMBER',
          ...orgConnect,
        },
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = addMinutes(new Date(), 15);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        magicLinkToken: token,
        magicLinkExpires: expires,
      },
    });

    const magicLink = `${this.config.get('APP_URL', 'http://localhost:3001')}/auth/magic-link/verify?token=${token}`;

    return { magicLink, email };
  }

  async verifyMagicLink(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        magicLinkToken: token,
        magicLinkExpires: { gte: new Date() },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid or expired magic link');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        magicLinkToken: null,
        magicLinkExpires: null,
        lastLoginAt: new Date(),
      },
    });

    return this.createTokenResponse(user);
  }

  private createTokenResponse(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      orgId: user.organizationId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }
}
