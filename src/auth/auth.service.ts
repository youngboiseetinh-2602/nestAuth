import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import { AuthTokenProvider } from './provider/auth-token.provider';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasher,
    private readonly authTokenProvider: AuthTokenProvider,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto);
    return this.authTokenProvider.issue(user);
  }

  async validateUser(dto: LoginDto) {
    const user = this.usersService.findByUsername(dto.username);
    const valid = await this.passwordHasher.verify(dto.password, user?.passwordHash);

    if (!user || !valid) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    return user;

  }
}
