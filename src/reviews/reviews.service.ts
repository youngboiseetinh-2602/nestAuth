import { BadRequestException, Injectable } from '@nestjs/common';
import type { CreateReviewDto, Review, UpdateReviewDto } from './dto/review.dto';
import { NotFoundException } from '@nestjs/common';
import { AuthorizationService } from '@nestjs/authorization';
import { ReviewPolicy } from '../authorization/policies/review.policy';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Injectable()
export class ReviewsService {
  constructor(private readonly authorization: AuthorizationService) {}

  private reviews: Review[] = [];

  private services = [
    { id: 'svc_001', name: 'Spa 60 phút', capacity: 4, price: 350000 },
    { id: 'svc_002', name: 'Gym theo buổi', capacity: 20, price: 80000 },
  ];

  private reviewIdCounter = 1;

  createReview(serviceId: string, body: CreateReviewDto, authorId: number): Review {
    const service = this.services.find((item) => item.id === serviceId);
    if (!service) {
      throw new NotFoundException('Dịch vụ không tồn tại');
    }

    const { authorName, rating, comment } = body;
    const review = {
      id: `rev_${this.reviewIdCounter}`,
      serviceId,
      authorId,
      authorName,
      rating,
      comment: comment ?? '',
    };
    this.reviews.push(review);
    this.reviewIdCounter++;
    return review;
  }

  getAllReviews(id: string): Review[] {
    const service = this.services.find((service) => service.id === id);
    if (!service) {
      throw new NotFoundException('Dịch vụ không tồn tại');
    }
    return this.reviews.filter((review) => review.serviceId === id);
  }

  async replaceReview(id: string, body: CreateReviewDto, user: AuthenticatedUser): Promise<Review> {
    const review = this.getReview(id);
    await this.authorization.authorize(ReviewPolicy, 'update', user, review);

    const { authorName, rating, comment } = body;
    // CreateReviewDto cho phép thiếu comment khi POST, nhưng PUT cần đủ trường.
    if (comment === undefined) {
      throw new BadRequestException('PUT bắt buộc có nhận xét (comment)');
    }

    review.authorName = authorName;
    review.rating = rating;
    review.comment = comment;
    return review;
  }

  getReview(id: string): Review {
    const review = this.reviews.find((review) => review.id === id);
    if (!review) {
      throw new NotFoundException('Đánh giá không tồn tại');
    }
    return review;
  }

  async updateReview(id: string, body: UpdateReviewDto, user: AuthenticatedUser): Promise<Review> {
    const review = this.getReview(id);
    await this.authorization.authorize(ReviewPolicy, 'update', user, review);

    const { authorName, rating, comment } = body;

    if (authorName !== undefined) {
      review.authorName = authorName;
    }

    if (rating !== undefined) {
      review.rating = rating;
    }

    if (comment !== undefined) {
      review.comment = comment;
    }

    return review;
  }


  async deleteReview(id: string, user: AuthenticatedUser): Promise<string> {
    const review = this.getReview(id);
    await this.authorization.authorize(ReviewPolicy, 'delete', user, review);

    const index = this.reviews.findIndex((review) => review.id === id);
    if (index === -1) {
      throw new NotFoundException('Đánh giá không tồn tại');
    }
    this.reviews.splice(index, 1);
    return 'Xóa đánh giá thành công';
  }

}
