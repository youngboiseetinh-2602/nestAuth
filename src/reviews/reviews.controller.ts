import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { ReviewsService } from './reviews.service';
import { CurrentUser, Public } from '@nestjs/authentication';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('api/v1')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('services/:serviceId/reviews')
  @Public()
  getAllReviews(@Param('serviceId') serviceId: string) {
    return this.reviewsService.getAllReviews(serviceId);
  }

  @Get('reviews/:id')
  @Public()
  getReview(@Param('id') id: string) {
    return this.reviewsService.getReview(id);
  }

  @Patch('reviews/:id')
  updateReview(
    @Param('id') id: string,
    @Body() body: UpdateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.updateReview(id, body, user);
  }

  @Delete('reviews/:id')
  deleteReview(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reviewsService.deleteReview(id, user);
  }

  @Put('reviews/:id')
  replaceReview(
    @Param('id') id: string,
    @Body() body: CreateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.replaceReview(id, body, user);
  }

  @Post('services/:serviceId/reviews')
  createReview(
    @Param('serviceId') serviceId: string,
    @Body() body: CreateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.createReview(serviceId, body, user.id);
  }
}
