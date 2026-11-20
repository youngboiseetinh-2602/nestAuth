import { Module } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  providers: [UsersService, PasswordHasher],
  exports: [UsersService],
  controllers: [UsersController]
})
export class UsersModule {}
