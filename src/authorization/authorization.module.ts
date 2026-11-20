import { Module } from '@nestjs/common';
import { AuthorizationModule as NestAuthorizationModule } from '@nestjs/authorization';
import { ReviewPolicy } from './policies/review.policy';

@Module({
  imports: [NestAuthorizationModule.forRoot({ globalGuard: false })],
  providers: [ReviewPolicy],
})
export class AuthorizationModule {}
