import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    private prisma: PrismaService,
    private schedulerService: SchedulerService,
  ) {}

  async findAll(orgId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { campaign: { organizationId: orgId } },
        include: {
          person: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          campaign: { select: { id: true, name: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.enrollment.count({ where: { campaign: { organizationId: orgId } } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, orgId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id, campaign: { organizationId: orgId } },
      include: {
        person: true,
        campaign: { include: { steps: { where: { deletedAt: null }, orderBy: { order: 'asc' } } } },
        stepStates: { include: { step: true }, orderBy: { step: { order: 'asc' } } },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  async enroll(orgId: string, dto: CreateEnrollmentDto) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: dto.campaignId, organizationId: orgId, status: 'ACTIVE', deletedAt: null },
      include: { steps: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
    });

    if (!campaign) throw new NotFoundException('Active campaign not found');
    if (!campaign.steps.length) throw new BadRequestException('Campaign has no steps');

    const newEnrollmentIds: string[] = [];

    for (const personId of dto.personIds) {
      const existing = await this.prisma.enrollment.findUnique({
        where: { personId_campaignId: { personId, campaignId: dto.campaignId } },
      });
      if (existing) continue;

      const firstStep = campaign.steps[0];
      const enrollment = await this.prisma.enrollment.create({
        data: {
          personId,
          campaignId: dto.campaignId,
          currentStepOrder: 1,
          stepStates: {
            create: { stepId: firstStep.id, status: 'PENDING' },
          },
        },
      });
      newEnrollmentIds.push(enrollment.id);
    }

    if (newEnrollmentIds.length > 0) {
      await this.schedulerService.queueNextMessages(newEnrollmentIds);
    }

    return { enrolled: newEnrollmentIds.length, skipped: dto.personIds.length - newEnrollmentIds.length };
  }

  async pause(id: string, orgId: string) {
    const enrollment = await this.findOne(id, orgId);
    await this.schedulerService.pauseEnrollmentJobs(id);
    return this.prisma.enrollment.update({ where: { id }, data: { status: 'PAUSED' } });
  }

  async resume(id: string, orgId: string) {
    await this.findOne(id, orgId);
    await this.prisma.enrollment.update({ where: { id }, data: { status: 'ACTIVE' } });
    await this.schedulerService.queueNextMessage(id);
    return { message: 'Enrollment resumed' };
  }

  async drop(id: string, orgId: string) {
    await this.findOne(id, orgId);
    await this.schedulerService.pauseEnrollmentJobs(id);
    return this.prisma.enrollment.update({ where: { id }, data: { status: 'DROPPED' } });
  }
}
