import type { UserRole } from '../../users/enums/user-role.enum';

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: UserRole;
}
