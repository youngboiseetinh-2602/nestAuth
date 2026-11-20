import { Policy } from '@nestjs/authorization';
import type { Review } from '../../reviews/dto/review.dto';
import { UserRole } from '../../users/enums/user-role.enum';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@Policy()
export class ReviewPolicy {
  update(user: AuthenticatedUser, review: Review): boolean {
    return user.role === UserRole.ADMIN || review.authorId === user.id;
  }

  delete(user: AuthenticatedUser, review: Review): boolean {
    return this.update(user, review);
  }
}
