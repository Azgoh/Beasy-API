export const mapReviewResponseDto = (review) => ({
  reviewId: review.id,
  reviewerId: review.user ? review.user.id : null,
  reviewerUsername: review.user ? review.user.username : null,
  professionalId: review.professional ? review.professional.id : null,
  professionalFirstName: review.professional ? review.professional.firstName : null,
  professionalLastName: review.professional ? review.professional.lastName : null,
  score: review.score,
  review: review.review,
  timestamp: review.timestamp,
});
