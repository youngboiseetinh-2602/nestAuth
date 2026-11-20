import { Injectable } from '@nestjs/common';
import { TokenService } from '@nestjs/authentication';

@Injectable()
export class AuthTokenProvider {
  constructor(private readonly tokenService: TokenService) {}

  async issue(user: { id: number }) {
    const { accessToken, expiresIn } = await this.tokenService.issue(
      String(user.id),
      { method: 'password' },
    );

    return { accessToken, expiresIn };
  }
}
