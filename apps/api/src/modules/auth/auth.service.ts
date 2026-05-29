import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { addDays, addHours } from 'date-fns';
import { slugify } from '@dripdesk/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { InviteAdminDto } from './dto/invite-admin.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { PasswordService } from './password.service';
import { TenantContext } from '../../common/tenant/tenant-context';

type UserWithMemberships = Prisma.UserGetPayload<{
  include: {
    memberships: {
      select: {
        organizationId: true;
        role: true;
      };
    };
  };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) throw new ConflictException('Email already in use');

    const slug = slugify(dto.organizationName);
    const existingOrg = await this.prisma.organization.findUnique({ where: { slug } });

    if (existingOrg) throw new ConflictException('Organization name already taken');

    const passwordHash = await this.passwords.hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'owner',
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: createdUser.id,
          role: 'owner',
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: createdUser.id },
        include: {
          memberships: {
            select: {
              organizationId: true,
              role: true,
            },
          },
        },
      });
    });

    return this.createTokenResponse(user);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        memberships: {
          select: {
            organizationId: true,
            role: true,
          },
        },
        personRecords: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.role === 'recipient' && user.personRecords.some((person) => person.status === 'deletion_requested')) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.passwords.verifyPassword(password, user.passwordHash);

    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.createTokenResponse(user);
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) return { requested: true };

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: addHours(new Date(), 1),
      },
    });

    const webUrl = this.config.get<string>('dripdesk.publicWebUrl', 'http://localhost:3001');
    const resetUrl = `${webUrl}/auth/password-reset?token=${token}`;
    const isProduction = this.config.get<string>('dripdesk.env') === 'production';

    return {
      requested: true,
      resetUrl: isProduction ? undefined : resetUrl,
    };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = this.hashToken(token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired password reset token');
    }

    const passwordHash = await this.passwords.hashPassword(password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { reset: true };
  }

  private createTokenResponse(user: UserWithMemberships) {
    const primaryMembership = user.memberships[0];
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: primaryMembership?.organizationId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: UserWithMemberships | User) {
    const memberships = 'memberships' in user ? user.memberships : [];
    const primaryMembership = memberships[0];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: primaryMembership?.organizationId ?? null,
      memberships,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async inviteAdmin(tenant: TenantContext, invitedBy: string, dto: InviteAdminDto) {
    const email = dto.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new ConflictException('User with this email already exists');

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    await this.prisma.inviteToken.create({
      data: {
        organizationId: tenant.organizationId,
        invitedBy,
        email,
        role: dto.role ?? 'admin',
        tokenHash,
        expiresAt: addDays(new Date(), 7),
      },
    });

    const webUrl = this.config.get<string>('dripdesk.publicWebUrl', 'http://localhost:3001');
    const acceptUrl = `${webUrl}/auth/accept-invite?token=${token}&email=${encodeURIComponent(email)}`;
    const isProduction = this.config.get<string>('dripdesk.env') === 'production';

    return {
      invited: true,
      email,
      acceptUrl: isProduction ? undefined : acceptUrl,
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const { token, email, password, firstName, lastName } = dto;
    const tokenHash = this.hashToken(token);
    const invite = await this.prisma.inviteToken.findUnique({ where: { tokenHash } });

    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired invite token');
    }

    if (invite.email !== email.toLowerCase().trim()) {
      throw new UnauthorizedException('Email does not match invite');
    }

    const passwordHash = await this.passwords.hashPassword(password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          firstName,
          lastName,
          role: 'admin',
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId: user.id,
          role: invite.role as any,
        },
      });

      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });

      return this.createTokenResponse(
        await tx.user.findUniqueOrThrow({
          where: { id: user.id },
          include: {
            memberships: {
              select: { organizationId: true, role: true },
            },
          },
        }),
      );
    });
  }
}
