import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PersonsService } from './persons.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { ImportPersonsDto } from './dto/import-persons.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('persons')
@Controller('persons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @Get()
  @ApiOperation({ summary: 'List all persons' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
  ) {
    return this.personsService.findAll(user.organizationId, +page, +limit, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get person by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.personsService.findOne(id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new person' })
  create(@Body() dto: CreatePersonDto, @CurrentUser() user: any) {
    return this.personsService.create(user.organizationId, dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Bulk import persons' })
  import(@Body() dto: ImportPersonsDto, @CurrentUser() user: any) {
    return this.personsService.importPersons(user.organizationId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a person' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreatePersonDto>,
    @CurrentUser() user: any,
  ) {
    return this.personsService.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a person' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.personsService.remove(id, user.organizationId);
  }

  @Post(':id/request-deletion')
  @ApiOperation({ summary: 'Request GDPR deletion of a person' })
  requestDeletion(@Param('id') id: string, @CurrentUser() user: any) {
    return this.personsService.requestDeletion(id, user.organizationId);
  }
}
