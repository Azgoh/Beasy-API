export const mapReviewResponseDto = (review) => ({
  reviewId: review.id,
  reviewerId: review.reviewer?.id,
  professionalId: review.professional?.id,
  professionalFirstName: review.professional?.firstName,
  professionalLastName: review.professional?.lastName,
  reviewerUsername: review.reviewer?.username,
  score: review.score,
  review: review.review,
  timestamp: review.timestamp,
});

export const mapReviewResponseDtoList = (reviews) => {
  return reviews.map(mapReviewResponseDto);
};
