import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StepsService } from './steps.service';
import { CreateStepDto } from './dto/create-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('steps')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StepsController {
  constructor(private readonly stepsService: StepsService) {}

  @Get('campaigns/:campaignId/steps')
  @ApiOperation({ summary: 'List steps for a campaign' })
  findByCampaign(@Param('campaignId') campaignId: string, @CurrentUser() user: any) {
    return this.stepsService.findByCampaign(campaignId, user.organizationId);
  }

  @Post('campaigns/:campaignId/steps')
  @ApiOperation({ summary: 'Create a step in a campaign' })
  create(
    @Param('campaignId') campaignId: string,
    @Body() dto: CreateStepDto,
    @CurrentUser() user: any,
  ) {
    return this.stepsService.create(campaignId, user.organizationId, dto);
  }

  @Post('campaigns/:campaignId/steps/reorder')
  @ApiOperation({ summary: 'Reorder steps in a campaign' })
  reorder(
    @Param('campaignId') campaignId: string,
    @Body() dto: ReorderStepsDto,
    @CurrentUser() user: any,
  ) {
    return this.stepsService.reorder(campaignId, user.organizationId, dto.stepIds);
  }

  @Patch('steps/:id')
  @ApiOperation({ summary: 'Update a step' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateStepDto>, @CurrentUser() user: any) {
    return this.stepsService.update(id, user.organizationId, dto);
  }

  @Delete('steps/:id')
  @ApiOperation({ summary: 'Soft delete a step' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.stepsService.remove(id, user.organizationId);
  }
}
