import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { slugify } from '@dripdesk/shared';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { billingPlan: true },
    });

    if (!org) throw new NotFoundException('Organization not found');
    return this.sanitize(org);
  }

  async findBySlug(slug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      include: { billingPlan: true },
    });

    if (!org) throw new NotFoundException('Organization not found');
    return this.sanitize(org);
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    const updated = await this.prisma.organization.update({
      where: { id },
      data: dto,
      include: { billingPlan: true },
    });

    return this.sanitize(updated);
  }

  async getUsage(id: string) {
    const [activeContacts, campaigns] = await Promise.all([
      this.prisma.person.count({
        where: { organizationId: id, deletedAt: null, globallyUnsubscribed: false },
      }),
      this.prisma.campaign.count({
        where: { organizationId: id, deletedAt: null },
      }),
    ]);

    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { billingPlan: true },
    });

    return {
      activeContacts,
      campaigns,
      limits: {
        activeContacts: org?.billingPlan?.activeContactsLimit ?? 10,
        campaigns: org?.billingPlan?.campaignsLimit ?? 1,
      },
    };
  }

  private sanitize(org: any) {
    const { twilioAuthToken, telegramBotToken, whatsappToken, smtpPassword, ...safe } = org;
    return {
      ...safe,
      hasTwilio: !!twilioAuthToken,
      hasTelegram: !!telegramBotToken,
      hasWhatsApp: !!whatsappToken,
      hasSmtp: !!smtpPassword,
    };
  }
}
