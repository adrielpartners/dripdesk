import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.enrollmentsService.findAll(user.organizationId, +page, +limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.enrollmentsService.findOne(id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Enroll persons into a campaign' })
  enroll(@Body() dto: CreateEnrollmentDto, @CurrentUser() user: any) {
    return this.enrollmentsService.enroll(user.organizationId, dto);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string, @CurrentUser() user: any) {
    return this.enrollmentsService.pause(id, user.organizationId);
  }

  @Post(':id/resume')
  resume(@Param('id') id: string, @CurrentUser() user: any) {
    return this.enrollmentsService.resume(id, user.organizationId);
  }

  @Post(':id/drop')
  drop(@Param('id') id: string, @CurrentUser() user: any) {
    return this.enrollmentsService.drop(id, user.organizationId);
  }
}
