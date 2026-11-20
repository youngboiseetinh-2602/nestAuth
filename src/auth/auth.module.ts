import { Module } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { AuthTokenProvider } from './provider/auth-token.provider';
import { JwtAuthProvider } from './provider/jwt-auth.provider';

@Module({
  imports: [UsersModule],
  providers: [AuthService, PasswordHasher, AuthTokenProvider, JwtAuthProvider],
  controllers: [AuthController]
})
export class AuthModule {}
