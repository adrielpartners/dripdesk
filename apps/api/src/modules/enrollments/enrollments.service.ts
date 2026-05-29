import { Injectable } from '@nestjs/common';
import { TenantContext } from '../../common/tenant/tenant-context';
import { EnrollmentsRepository } from './enrollments.repository';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly enrollments: EnrollmentsRepository) {}

  findUsage(tenant: TenantContext) {
    return this.enrollments.findUsageForTenant(tenant);
  }

  findByCampaign(tenant: TenantContext, campaignId: string, page: number, limit: number) {
    return this.enrollments.findManyForCampaign(tenant, campaignId, Math.max(1, page), Math.min(Math.max(1, limit), 100));
  }

  findByPerson(tenant: TenantContext, personId: string, page: number, limit: number) {
    return this.enrollments.findManyForPerson(tenant, personId, Math.max(1, page), Math.min(Math.max(1, limit), 100));
  }

  enrollPersonInCampaign(tenant: TenantContext, campaignId: string, personId: string) {
    return this.enrollments.createForTenant(tenant, campaignId, personId);
  }

  pause(tenant: TenantContext, id: string) {
    return this.enrollments.pauseForTenant(tenant, id);
  }

  remove(tenant: TenantContext, id: string) {
    return this.enrollments.removeForTenant(tenant, id);
  }
}
