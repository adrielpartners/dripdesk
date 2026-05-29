import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { InviteAdminDto } from './dto/invite-admin.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantContext } from '../../common/tenant/tenant-context';
import { ok } from '../../common/api-response';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new account and organization' })
  async register(@Body() dto: RegisterDto) {
    return ok(await this.authService.register(dto));
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto) {
    return ok(await this.authService.login(dto.email, dto.password));
  }

  @Post('password-reset/request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Request a password reset token' })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return ok(await this.authService.requestPasswordReset(dto.email));
  }

  @Post('password-reset/complete')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Complete password reset' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return ok(await this.authService.resetPassword(dto.token, dto.password));
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current token session' })
  logout() {
    return ok({ loggedOut: true });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  me(@CurrentUser() user: any) {
    return ok({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId ?? null,
      memberships: user.memberships ?? [],
    });
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard, CurrentOrganizationGuard, RolesGuard)
  @Roles('owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite an admin to the organization' })
  async invite(@CurrentTenant() tenant: TenantContext, @CurrentUser() user: any, @Body() dto: InviteAdminDto) {
    return ok(await this.authService.inviteAdmin(tenant, user.id, dto));
  }

  @Post('invite/accept')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Accept an invite and create account' })
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return ok(await this.authService.acceptInvite(dto));
  }
}
