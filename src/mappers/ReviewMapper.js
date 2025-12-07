export function mapReviewResponseDto(review) {
  if (!review) return null;

  return {
    id: review.id,
    userId: review.user_id,
    professionalId: review.professional_id,
    score: review.score,
    review: review.review,
    timestamp: review.timestamp,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export function mapReviewResponseDtoList(reviews) {
  if (!reviews || !Array.isArray(reviews)) return [];
  return reviews.map(mapReviewResponseDto);
}
