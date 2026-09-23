import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';
import { PersonsRepository } from './persons.repository';
import { UpdatePersonChannelDto } from './dto/update-person-channel.dto';
import type { TenantContext } from '../../common/tenant/tenant-context';

test('channel PATCH retains runtime validation and validates address-only changes', async () => {
  const params = Reflect.getMetadata('design:paramtypes', PersonsController.prototype, 'updateChannel') as unknown[];
  assert.equal(params[3], UpdatePersonChannelDto);
  assert.ok(validateSync(plainToInstance(UpdatePersonChannelDto, { enabled: 'yes' })).length > 0);

  let updatedAddress = '';
  const repository = {
    findManyForTenant: async (_tenant: TenantContext, page: number) => ({ data: [], total: 0, page, limit: 50, totalPages: 0 }),
    findByIdForTenant: async () => ({ channels: [{ id: 'channel-1', channelType: 'sms', address: '+15551234567' }] }),
    updateChannelForTenant: async (_tenant: TenantContext, _personId: string, _channelId: string, dto: UpdatePersonChannelDto) => {
      updatedAddress = dto.address ?? '';
      return dto;
    },
  } as unknown as PersonsRepository;
  const service = new PersonsService(repository);
  const tenant = { organizationId: 'org-1', userId: 'user-1', membershipRole: 'owner' } as TenantContext;

  await assert.rejects(service.updateChannel(tenant, 'person-1', 'channel-1', { address: 'not-a-phone' }), BadRequestException);
  await service.updateChannel(tenant, 'person-1', 'channel-1', { address: ' +15557654321 ' });
  assert.equal(updatedAddress, '+15557654321');
  assert.equal((await service.findAll(tenant, Number.NaN, Number.NaN)).page, 1);
});
