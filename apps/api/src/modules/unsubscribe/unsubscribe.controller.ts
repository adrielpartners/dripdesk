import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ok } from '../../common/api-response';
import { UnsubscribeActionDto } from './dto/unsubscribe-action.dto';
import { UnsubscribeService } from './unsubscribe.service';

@ApiTags('unsubscribe')
@Controller('unsubscribe')
export class UnsubscribeController {
  constructor(private readonly unsubscribe: UnsubscribeService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Resolve unsubscribe token context' })
  async resolve(@Param('token') token: string) {
    return ok(await this.unsubscribe.resolve(token));
  }

  @Post(':token')
  @ApiOperation({ summary: 'Apply unsubscribe or deletion request action' })
  async apply(@Param('token') token: string, @Body() dto: UnsubscribeActionDto) {
    return ok(await this.unsubscribe.apply(token, dto.action));
  }
}
