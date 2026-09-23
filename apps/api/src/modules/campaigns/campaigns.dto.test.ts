import assert from 'node:assert/strict';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateCampaignDto } from './dto/create-campaign.dto';

test('invalid schedule times are rejected before a campaign can silently stall', () => {
  const invalid = plainToInstance(CreateCampaignDto, { name: 'Test', scheduleConfig: { sendTime: '99:99' } });
  const valid = plainToInstance(CreateCampaignDto, { name: 'Test', scheduleConfig: { sendTime: '09:30' } });
  assert.ok(validateSync(invalid).length > 0);
  assert.equal(validateSync(valid).length, 0);
});
