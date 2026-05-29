import { IsIn } from 'class-validator';

export class UnsubscribeActionDto {
  @IsIn(['campaign', 'global', 'delete'])
  action!: 'campaign' | 'global' | 'delete';
}
