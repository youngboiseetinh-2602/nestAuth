import { Injectable } from '@nestjs/common';
import { AuthenticationRegistry, JwtBearerProvider } from '@nestjs/authentication';
import type { JwtClaims } from '@nestjs/authentication';
import { UsersService } from '../../users/users.service';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class JwtAuthProvider extends JwtBearerProvider<AuthenticatedUser> {
  constructor(
    private readonly usersService: UsersService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  protected validate(claims: JwtClaims) {
    const userId = Number(claims.sub);
    if (!Number.isSafeInteger(userId) || userId < 1) return null;

    return this.usersService.findById(userId) ?? null;
  }
}
