import { ConflictException, Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { UserRole } from './enums/user-role.enum';
import type { CreateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly passwordHasher: PasswordHasher) {}

  private nextUserId = 1;

  private readonly users: {
    id: number;
    username: string;
    passwordHash: string;
    role: UserRole;
  }[] = [];

  findByUsername(username: string) {
    return this.users.find((user) => user.username === username.trim());
  }

  findById(id: number) {
    const user = this.users.find((user) => user.id === id);
    if (!user) return undefined;

    return { id: user.id, username: user.username, role: user.role };
  }

  async register(dto: CreateUserDto) {
    const username = dto.username.trim();
    const passwordHash = await this.passwordHasher.hash(dto.password);

    if (this.users.some((user) => user.username === username)) {
      throw new ConflictException('Tên người dùng đã tồn tại');
    }

    const user = {
      id: this.nextUserId++,
      username,
      passwordHash,
      role: UserRole.USER,
    };
    this.users.push(user);
    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }
}
