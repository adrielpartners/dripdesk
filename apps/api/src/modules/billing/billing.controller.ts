import { Body, Controller, Get, Headers, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ok } from '../../common/api-response';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrganizationGuard } from '../../common/guards/current-organization.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantContext } from '../../common/tenant/tenant-context';
import { BillingService } from './billing.service';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List billing plans' })
  getPlans() {
    return ok(this.billingService.getPlans());
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard, CurrentOrganizationGuard, RolesGuard)
  @Roles('owner', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current billing usage and limits' })
  async getUsage(@CurrentTenant() tenant: TenantContext) {
    return ok(await this.billingService.getUsage(tenant));
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, CurrentOrganizationGuard, RolesGuard)
  @Roles('owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Checkout session for a plan' })
  async checkout(@CurrentTenant() tenant: TenantContext, @Body() body: { planId: string }) {
    return ok(await this.billingService.createCheckoutSession(tenant, body.planId));
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard, CurrentOrganizationGuard, RolesGuard)
  @Roles('owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe customer portal session' })
  async portal(@CurrentTenant() tenant: TenantContext) {
    return ok(await this.billingService.createCustomerPortalSession(tenant));
  }

  @Post('webhook')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiOperation({ summary: 'Handle Stripe billing webhooks' })
  async webhook(@Req() req: RawBodyRequest<any>, @Headers('stripe-signature') signature: string) {
    return ok(await this.billingService.handleWebhook(req.rawBody ?? Buffer.from(''), signature));
  }
}
