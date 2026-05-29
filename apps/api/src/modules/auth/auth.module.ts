import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PasswordService } from './password.service';

type JwtExpiresIn = NonNullable<NonNullable<JwtModuleOptions['signOptions']>['expiresIn']>;

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('dripdesk.sessionSecret', ''),
        signOptions: {
          expiresIn: configService.get<string>('dripdesk.jwtExpiresIn', '7d') as JwtExpiresIn,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, PasswordService],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
