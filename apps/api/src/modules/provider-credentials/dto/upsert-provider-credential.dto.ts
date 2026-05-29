import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export type ProviderType = 'twilio' | 'telegram' | 'smtp';

export class UpsertProviderCredentialDto {
  @IsIn(['twilio', 'telegram', 'smtp'])
  providerType!: ProviderType;

  @IsOptional()
  @IsString()
  accountSid?: string;

  @IsOptional()
  @IsString()
  authToken?: string;

  @IsOptional()
  @IsString()
  fromNumber?: string;

  @IsOptional()
  @IsString()
  botToken?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  port?: number;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  fromEmail?: string;

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @IsOptional()
  @IsIn(['brevo', 'sendgrid', 'mailgun', 'generic'])
  preset?: 'brevo' | 'sendgrid' | 'mailgun' | 'generic';
}
