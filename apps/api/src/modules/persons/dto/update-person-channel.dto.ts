import { PartialType } from '@nestjs/mapped-types';
import { PersonChannelDto } from './person-channel.dto';

export class UpdatePersonChannelDto extends PartialType(PersonChannelDto) {}
