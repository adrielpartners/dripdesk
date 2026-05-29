import { Injectable } from '@nestjs/common';
import { TenantContext } from '../../common/tenant/tenant-context';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsRepository } from './organizations.repository';

@Injectable()
export class OrganizationsService {
  constructor(private readonly organizations: OrganizationsRepository) {}

  async listForUser(userId: string) {
    return this.organizations.findManyForUser(userId);
  }

  async findCurrent(tenant: TenantContext) {
    return this.organizations.findForTenant(tenant);
  }

  async updateCurrent(tenant: TenantContext, dto: UpdateOrganizationDto) {
    return this.organizations.updateForTenant(tenant, dto);
  }
}
